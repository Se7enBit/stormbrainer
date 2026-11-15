import { createGeminiProvider } from '../ai/gemini';
import type { AiProvider } from '../ai/provider';
import { deck } from '../sparks/deck';
import { SparkSource } from '../sparks/source';

/** The app's one spark source. The API key lives only inside its provider, never in state. */
export const sparkSource = new SparkSource({ deck });

let provider: AiProvider | null = null;

export function configureAi(apiKey: string | null, model: string): void {
  provider = apiKey ? createGeminiProvider({ apiKey, model }) : null;
  sparkSource.setProvider(provider);
}

export function currentProvider(): AiProvider | null {
  return provider;
}
