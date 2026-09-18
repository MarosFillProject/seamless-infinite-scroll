export type InfiniteScrollRequestReason = 'initial' | 'prefetch';

export interface InfiniteScrollRequest {
  readonly reason: InfiniteScrollRequestReason;
  readonly requestedCount: number;
  readonly loadedCount: number;
  readonly triggerIndex: number | null;
}

export type InfiniteScrollRequestKey = string | number | null;
