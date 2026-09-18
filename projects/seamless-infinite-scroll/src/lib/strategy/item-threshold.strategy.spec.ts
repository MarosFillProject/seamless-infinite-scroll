import { calculateTriggerIndex } from './item-threshold.strategy';

describe('calculateTriggerIndex', () => {
  it('uses the midpoint for 30 items by default', () => {
    expect(calculateTriggerIndex(30, 0.5)).toBe(15);
  });

  it('keeps the trigger inside small collections', () => {
    expect(calculateTriggerIndex(1, 0.5)).toBe(0);
    expect(calculateTriggerIndex(2, 1)).toBe(1);
  });

  it('rejects invalid values', () => {
    expect(() => calculateTriggerIndex(0, 0.5)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 0)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 1.1)).toThrowError(RangeError);
  });
});
