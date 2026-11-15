import { MAX_SPARK_TEXT } from '../sparks/types';
import { sparkButtonSize } from './SparkButton';
import { MIN_CARD_FONT_SIZE, cardFontSize } from './theme';

describe('cardFontSize', () => {
  it('is never below the minimum, even for the longest allowed text', () => {
    expect(cardFontSize('x'.repeat(MAX_SPARK_TEXT))).toBe(MIN_CARD_FONT_SIZE);
    expect(cardFontSize('x'.repeat(500))).toBeGreaterThanOrEqual(28);
  });

  it('shrinks as the text gets longer', () => {
    let previous = Infinity;
    for (let length = 1; length <= MAX_SPARK_TEXT; length++) {
      const size = cardFontSize('x'.repeat(length));
      expect(size).toBeLessThanOrEqual(previous);
      previous = size;
    }
    expect(cardFontSize('Short?')).toBeGreaterThan(cardFontSize('x'.repeat(120)));
  });
});

describe('sparkButtonSize', () => {
  it('fits the measured space, whichever side is tighter, capped at 340', () => {
    expect(sparkButtonSize({ width: 400, height: 800 })).toBe(280);
    expect(sparkButtonSize({ width: 400, height: 200 })).toBe(180);
    expect(sparkButtonSize({ width: 1000, height: 1000 })).toBe(340);
    expect(sparkButtonSize({ width: 0, height: 0 })).toBe(0);
  });
});
