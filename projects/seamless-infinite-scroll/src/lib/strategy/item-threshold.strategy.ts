export function calculateTriggerIndex(itemCount: number, progressThreshold: number): number {
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new RangeError('itemCount must be a positive integer.');
  }

  if (!Number.isFinite(progressThreshold) || progressThreshold <= 0 || progressThreshold > 1) {
    throw new RangeError('progressThreshold must be greater than 0 and less than or equal to 1.');
  }

  return Math.min(itemCount - 1, Math.floor(itemCount * progressThreshold));
}
