import { ANGLES, pickAngle } from './angles';

describe('angles', () => {
  it('has about 40 distinct angles', () => {
    expect(ANGLES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ANGLES).size).toBe(ANGLES.length);
  });

  it('picks from the list, including both ends', () => {
    expect(pickAngle(() => 0)).toBe(ANGLES[0]);
    expect(pickAngle(() => 0.999999)).toBe(ANGLES[ANGLES.length - 1]);
    expect(ANGLES).toContain(pickAngle());
  });
});
