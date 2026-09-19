import { calculateTriggerIndex } from './item-threshold.strategy';

describe('calculateTriggerIndex', () => {
  it('uses 20% of the initial batch by default', () => {
    expect(calculateTriggerIndex(30, 0, 0.2)).toBe(6);
  });

  it('uses 20% of the latest appended batch', () => {
    expect(calculateTriggerIndex(90, 70, 0.2)).toBe(74);
  });

  it('keeps the trigger inside small collections', () => {
    expect(calculateTriggerIndex(1, 0, 0.2)).toBe(0);
    expect(calculateTriggerIndex(2, 0, 1)).toBe(1);
  });

  it('rejects invalid values', () => {
    expect(() => calculateTriggerIndex(0, 0, 0.2)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, -1, 0.2)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 10, 0.2)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 0, 0)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 0, 1.1)).toThrowError(RangeError);
  });
});
