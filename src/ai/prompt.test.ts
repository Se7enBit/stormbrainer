import { SPARK_TYPES, type SparkRequest } from '../sparks/types';
import {
  MAX_CONTEXT_LENGTH,
  RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
  buildGenerateContentBody,
  buildUserPrompt,
  cleanContext,
} from './prompt';

const request: SparkRequest = {
  types: ['debate', 'memoryLane'],
  vibe: 'spicy',
  workSafe: false,
  angle: 'travel and trips',
  avoid: [],
  count: 5,
};

describe('SYSTEM_INSTRUCTION', () => {
  it('carries the content rules', () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/read.*aloud/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/at most 160 characters/);
    expect(SYSTEM_INSTRUCTION).toMatch(/no emojis/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/Never invent shared history/);
    expect(SYSTEM_INSTRUCTION).toMatch(/Never target, mock or single out an individual/);
    for (const type of SPARK_TYPES) expect(SYSTEM_INSTRUCTION).toContain(`- ${type}:`);
  });
});

describe('buildUserPrompt', () => {
  it('asks for the count, types, vibe and angle', () => {
    const prompt = buildUserPrompt(request);
    expect(prompt).toContain('Write 5 sparks.');
    expect(prompt).toContain('debate, memoryLane');
    expect(prompt).toContain('Vibe: spicy');
    expect(prompt).toContain('Angle: travel and trips.');
    expect(prompt).not.toContain('Avoid list');
    expect(prompt).not.toContain('The group');
  });

  it('spells out the work-safe exclusions only when work-safe is on', () => {
    expect(buildUserPrompt(request)).toContain('Work-safe is off');
    const safe = buildUserPrompt({ ...request, workSafe: true });
    expect(safe).toContain('Work-safe is ON');
    for (const topic of [
      'politics',
      'religion',
      'sex',
      'drugs',
      'salaries',
      'health',
      'relationships',
    ]) {
      expect(safe).toContain(topic);
    }
  });

  it('quotes a cleaned context line', () => {
    const prompt = buildUserPrompt({ ...request, context: '  old uni friends\n at a cabin ' });
    expect(prompt).toContain('The group: "old uni friends at a cabin".');
  });

  it('lists recent texts to avoid, at most 30', () => {
    const avoid = Array.from({ length: 40 }, (_, i) => `Spark ${i}`);
    const prompt = buildUserPrompt({ ...request, avoid });
    expect(prompt).toContain('- Spark 0');
    expect(prompt).toContain('- Spark 29');
    expect(prompt).not.toContain('- Spark 30');
  });
});

describe('cleanContext', () => {
  it('trims, collapses whitespace and caps the length', () => {
    expect(cleanContext(undefined)).toBeUndefined();
    expect(cleanContext('   ')).toBeUndefined();
    expect(cleanContext(' new  team ')).toBe('new team');
    expect(cleanContext('x'.repeat(150))).toHaveLength(MAX_CONTEXT_LENGTH);
  });
});

describe('buildGenerateContentBody', () => {
  it('asks for structured JSON with the schema', () => {
    const body = buildGenerateContentBody(request);
    expect(body.systemInstruction.parts[0]?.text).toBe(SYSTEM_INSTRUCTION);
    expect(body.contents[0]?.parts[0]?.text).toBe(buildUserPrompt(request));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toBe(RESPONSE_SCHEMA);
    expect(RESPONSE_SCHEMA.properties.sparks.items.properties.type.enum).toEqual(SPARK_TYPES);
  });
});
