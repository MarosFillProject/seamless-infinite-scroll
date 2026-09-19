import { calculateTriggerIndex } from './item-threshold.strategy';

describe('calculateTriggerIndex', () => {
  it('uses the midpoint of the initial batch', () => {
    expect(calculateTriggerIndex(30, 0, 0.5)).toBe(15);
  });

  it('uses the midpoint of the latest appended batch', () => {
    expect(calculateTriggerIndex(90, 70, 0.5)).toBe(80);
  });

  it('keeps the trigger inside small collections', () => {
    expect(calculateTriggerIndex(1, 0, 0.5)).toBe(0);
    expect(calculateTriggerIndex(2, 0, 1)).toBe(1);
  });

  it('rejects invalid values', () => {
    expect(() => calculateTriggerIndex(0, 0, 0.5)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, -1, 0.5)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 10, 0.5)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 0, 0)).toThrowError(RangeError);
    expect(() => calculateTriggerIndex(10, 0, 1.1)).toThrowError(RangeError);
  });
});
