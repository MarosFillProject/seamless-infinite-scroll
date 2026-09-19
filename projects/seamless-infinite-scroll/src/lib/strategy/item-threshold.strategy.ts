export function calculateTriggerIndex(
  itemCount: number,
  batchStartIndex: number,
  progressThreshold: number,
): number {
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new RangeError('itemCount must be a positive integer.');
  }

  if (!Number.isInteger(batchStartIndex) || batchStartIndex < 0 || batchStartIndex >= itemCount) {
    throw new RangeError('batchStartIndex must identify an item in the collection.');
  }

  if (!Number.isFinite(progressThreshold) || progressThreshold <= 0 || progressThreshold > 1) {
    throw new RangeError('progressThreshold must be greater than 0 and less than or equal to 1.');
  }

  const batchSize = itemCount - batchStartIndex;
  return Math.min(itemCount - 1, batchStartIndex + Math.floor(batchSize * progressThreshold));
}
