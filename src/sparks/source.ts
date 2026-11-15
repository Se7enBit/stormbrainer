import { pickAngle } from '../ai/angles';
import { cleanContext } from '../ai/prompt';
import {
  isAiError,
  toAiProblem,
  type AiErrorKind,
  type AiProblem,
  type AiProvider,
} from '../ai/provider';
import { drawFromDeck } from './deck';
import { hasSeen, recordShown, type History } from './history';
import type { Spark, SparkFilters, SparkRequest } from './types';

/** Sparks per AI request (SPEC F4): one request, five taps. */
export const BATCH_SIZE = 5;
/** Refill in the background once this few queued sparks remain. */
export const REFILL_AT = 1;
/** How long a tap waits for AI before showing a deck card instead (rare: Home prefetches). */
export const AI_WAIT_MS = 8_000;
/** After a quota error, use the deck for this long before trying AI again. */
export const QUOTA_COOLDOWN_MS = 60_000;
/** After a network, blocked or bad-output error, use the deck for this long. */
export const ERROR_COOLDOWN_MS = 20_000;

export interface SourceSettings {
  filters: SparkFilters;
  /** Group context for AI; ignored by the deck. */
  context?: string;
}

export interface NextResult {
  spark: Spark;
  history: History;
  /** Set when this card came from the deck because AI failed. */
  aiProblem?: AiProblem;
}

interface SourceDeps {
  deck: readonly Spark[];
  random?: () => number;
  now?: () => number;
  aiWaitMs?: number;
}

/** Errors that need the user (fix the key or model), not just time. */
const NEEDS_USER: readonly AiErrorKind[] = ['invalidKey', 'modelNotFound'];

/** Queue key: the queue is only valid for the settings it was filled with. */
export function settingsKey({ filters, context }: SourceSettings): string {
  return JSON.stringify([
    [...filters.types].sort(),
    filters.vibe,
    filters.workSafe,
    cleanContext(context) ?? '',
  ]);
}

/** One batch; a blocked or empty answer is retried once with a different angle. */
export async function fetchBatch(
  provider: AiProvider,
  request: SparkRequest,
  random: () => number = Math.random,
): Promise<Spark[]> {
  try {
    return await provider.generateSparks(request);
  } catch (error) {
    if (!isAiError(error) || error.kind !== 'blocked') throw error;
    return provider.generateSparks({ ...request, angle: pickAngle(random, request.angle) });
  }
}

/**
 * Where sparks come from: AI when a key is set and working, otherwise (or on any failure) the
 * offline deck. AI sparks are fetched in batches into a queue so most taps are instant.
 * Every path ends in a card: errors only change where it comes from.
 */
export class SparkSource {
  private readonly deck: readonly Spark[];
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly aiWaitMs: number;

  private provider: AiProvider | null = null;
  private queue: Spark[] = [];
  private queueKey = '';
  private inFlight: { key: string; promise: Promise<void> } | null = null;
  /** No AI calls before this time (cooldown after an error). */
  private pausedUntil = 0;
  /** Set by errors only the user can fix; cleared when the provider changes. */
  private disabledBy: AiErrorKind | null = null;
  private lastProblem: AiProblem | null = null;

  constructor({ deck, random = Math.random, now = Date.now, aiWaitMs = AI_WAIT_MS }: SourceDeps) {
    this.deck = deck;
    this.random = random;
    this.now = now;
    this.aiWaitMs = aiWaitMs;
  }

  /** New key or model (or none): start fresh. */
  setProvider(provider: AiProvider | null): void {
    this.provider = provider;
    this.queue = [];
    this.inFlight = null;
    this.pausedUntil = 0;
    this.disabledBy = null;
    this.lastProblem = null;
  }

  get hasProvider(): boolean {
    return this.provider !== null;
  }

  /**
   * Fetch a batch in the background for these settings if none is queued, so the next tap is
   * instant. Home calls this when it shows and when the chips or context change.
   */
  prefetch(settings: SourceSettings, history: History): void {
    const key = settingsKey(settings);
    if (key !== this.queueKey) {
      this.queue = [];
      this.queueKey = key;
    }
    if (this.queue.length <= REFILL_AT) this.refill(settings, history);
  }

  /** The next card. `onWait` is called only if the tap has to wait for the network. */
  async next(
    settings: SourceSettings,
    history: History,
    current: Spark | null = null,
    onWait?: () => void,
  ): Promise<NextResult | null> {
    const key = settingsKey(settings);
    if (key !== this.queueKey) {
      this.queue = [];
      this.queueKey = key;
    }

    if (this.aiAvailable()) {
      let spark = this.takeUnseen(history);
      if (!spark) {
        const pending = this.refill(settings, history);
        if (pending) {
          onWait?.();
          await this.waitAtMost(pending, this.aiWaitMs);
        }
        spark = this.queueKey === key ? this.takeUnseen(history) : undefined;
      }
      if (spark) {
        const shown = recordShown(history, spark);
        // Top up in the background, avoiding what was just shown too.
        if (this.queue.length <= REFILL_AT) this.refill(settings, shown);
        return { spark, history: shown };
      }
    }

    const draw = drawFromDeck(this.deck, settings.filters, history, this.random, current);
    if (!draw) return null;
    return this.provider && this.lastProblem ? { ...draw, aiProblem: this.lastProblem } : draw;
  }

  private aiAvailable(): boolean {
    return this.provider !== null && this.disabledBy === null && this.now() >= this.pausedUntil;
  }

  private takeUnseen(history: History): Spark | undefined {
    while (this.queue.length > 0) {
      const spark = this.queue.shift();
      if (spark && !hasSeen(history, spark)) return spark;
    }
    return undefined;
  }

  /** Start a background request for these settings unless one is already running. */
  private refill(settings: SourceSettings, history: History): Promise<void> | null {
    const provider = this.provider;
    if (!provider || !this.aiAvailable()) return null;
    const key = settingsKey(settings);
    if (this.inFlight?.key === key) return this.inFlight.promise;

    const request: SparkRequest = {
      ...settings.filters,
      context: cleanContext(settings.context),
      angle: pickAngle(this.random),
      avoid: [...history.recentTexts, ...this.queue.map((s) => s.text)],
      count: BATCH_SIZE,
    };
    const promise = fetchBatch(provider, request, this.random)
      .then((sparks) => {
        // Settings or key changed meanwhile: these sparks are for something else.
        if (this.provider !== provider || this.queueKey !== key) return;
        this.queue.push(...sparks);
        this.lastProblem = null;
      })
      .catch((error: unknown) => {
        if (this.provider !== provider) return;
        this.fail(toAiProblem(error));
      })
      .finally(() => {
        if (this.inFlight?.promise === promise) this.inFlight = null;
      });
    this.inFlight = { key, promise };
    return promise;
  }

  private fail(problem: AiProblem): void {
    const { kind } = problem;
    this.lastProblem = problem;
    if (NEEDS_USER.includes(kind)) {
      this.disabledBy = kind;
    } else {
      this.pausedUntil = this.now() + (kind === 'quota' ? QUOTA_COOLDOWN_MS : ERROR_COOLDOWN_MS);
    }
  }

  private async waitAtMost(promise: Promise<void>, ms: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });
    try {
      await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
