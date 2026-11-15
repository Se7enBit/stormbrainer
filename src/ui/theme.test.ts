import { MAX_SPARK_TEXT } from '../sparks/types';
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
