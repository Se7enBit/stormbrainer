import { RECENT_TEXTS_LIMIT } from '../sparks/history';
import {
  MAX_SPARK_TEXT,
  SPARK_TYPES,
  type Mode,
  type SparkRequest,
  type Vibe,
} from '../sparks/types';

/** Max length of the optional group context or brainstorm topic. */
export const MAX_CONTEXT_LENGTH = 100;

export const SYSTEM_INSTRUCTION = [
  'You write conversation sparks that one person reads aloud to a group sitting together.',
  `Each spark is one sentence where possible, at most ${MAX_SPARK_TEXT} characters, with no preamble, no emojis and no numbering.`,
  'Spark types:',
  '- debate: a genuinely two-sided question that is fun to argue. Give two short sides in "options"; both must be defensible.',
  '- hotTake: a confident, slightly contrarian opinion people will want to react to. No options.',
  '- memoryLane: a question that invites the stories of the people in this group, like "the most chaotic trip anyone here has been on". Never invent shared history or facts about the group. No options.',
  '- whatIf: a hypothetical, or a would-you-rather with two balanced choices in "options".',
  'Never target, mock or single out an individual. No harassment, hate or sexual content.',
  'Use the angle as inspiration. Never repeat or closely paraphrase anything in the avoid list.',
  'Return only JSON that matches the response schema.',
].join('\n');

/** Brainstorm (SPEC §9): one concrete idea per item, or a creativity prompt without a topic. */
export const BRAINSTORM_INSTRUCTION = [
  'You help a person or a group brainstorm. Each item is one idea, read aloud or on a phone card.',
  `Each idea is one sentence where possible, at most ${MAX_SPARK_TEXT} characters, with no preamble, no emojis and no numbering.`,
  'With a topic: every idea is concrete and specific to that topic, something you could actually do, make, try or say. Not vague advice, not a list of options in one item.',
  'Without a topic: write creativity prompts, small imaginative challenges that get people inventing, like "Invent a holiday that celebrates something ordinary".',
  'Make the ideas in a batch differ from each other: different scales, budgets, audiences and angles.',
  'Every item has type "idea" and no options.',
  'Never target, mock or single out an individual. No harassment, hate or sexual content.',
  'Use the angle as extra inspiration. Never repeat or closely paraphrase anything in the avoid list.',
  'Return only JSON that matches the response schema.',
].join('\n');

export function systemInstructionFor(mode: Mode): string {
  return mode === 'brainstorm' ? BRAINSTORM_INSTRUCTION : SYSTEM_INSTRUCTION;
}

const VIBE_GUIDE: Record<Mode, Record<Vibe, string>> = {
  sparks: {
    light: 'light: playful and easy, anyone can jump in',
    deep: 'deep: thoughtful, invites real reflection without getting heavy',
    spicy: 'spicy: bold and provocative enough to start an argument, never offensive',
  },
  brainstorm: {
    light: 'light: practical and easy to try soon',
    deep: 'deep: thoughtful and meaningful, worth real effort',
    spicy: 'spicy: bold, wild and unconventional, still possible',
  },
};

const WORK_SAFE_ON =
  'Work-safe is ON: avoid politics, religion, sex, drugs and alcohol, salaries and personal money, health and relationships, and anything that could single out a person. Spicy means playfully provocative.';
const WORK_SAFE_OFF = 'Work-safe is off: grown-up topics are fine, within the rules above.';

/** One line, trimmed, at most MAX_CONTEXT_LENGTH chars; undefined when empty. */
export function cleanContext(context: string | undefined): string | undefined {
  const cleaned = context?.replace(/\s+/g, ' ').trim().slice(0, MAX_CONTEXT_LENGTH).trim();
  return cleaned ? cleaned : undefined;
}

export function buildUserPrompt(request: SparkRequest): string {
  const lines =
    request.mode === 'brainstorm'
      ? [request.count === 1 ? 'Write 1 idea.' : `Write ${request.count} ideas.`]
      : [
          request.count === 1 ? 'Write 1 spark.' : `Write ${request.count} sparks.`,
          `Types (spread them across these): ${request.types.join(', ')}.`,
        ];
  lines.push(
    `Vibe: ${VIBE_GUIDE[request.mode][request.vibe]}.`,
    request.workSafe ? WORK_SAFE_ON : WORK_SAFE_OFF,
  );
  if (request.mode === 'brainstorm') {
    const topic = cleanContext(request.topic);
    // The user's own words, quoted so they read as data.
    lines.push(topic ? `Topic: ${JSON.stringify(topic)}.` : 'No topic: write creativity prompts.');
  } else {
    const context = cleanContext(request.context);
    // The context is the host's own description of the group, quoted so it reads as data.
    if (context) lines.push(`The group: ${JSON.stringify(context)}.`);
  }
  lines.push(`Angle: ${request.angle}.`);
  const avoid = request.avoid.slice(0, RECENT_TEXTS_LIMIT);
  if (avoid.length > 0) {
    lines.push('Avoid list (already used):', ...avoid.map((text) => `- ${text}`));
  }
  return lines.join('\n');
}

/** Structured output schema (Gemini's OpenAPI subset). parse.ts still validates everything. */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sparks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: [...SPARK_TYPES] },
          text: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['type', 'text'],
        propertyOrdering: ['type', 'text', 'options'],
      },
    },
  },
  required: ['sparks'],
} as const;

export type ThinkingLevel = 'low' | 'medium' | 'high';

/** Request body for Gemini `generateContent`. */
export function buildGenerateContentBody(
  request: SparkRequest,
  options: { thinkingLevel?: ThinkingLevel; maxOutputTokens?: number } = {},
) {
  return {
    systemInstruction: { parts: [{ text: systemInstructionFor(request.mode) }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(request) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 1,
      ...(options.thinkingLevel && { thinkingConfig: { thinkingLevel: options.thinkingLevel } }),
      ...(options.maxOutputTokens && { maxOutputTokens: options.maxOutputTokens }),
    },
  };
}
