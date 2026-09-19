import {
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { InfiniteScrollRequest, InfiniteScrollRequestKey } from '../models/infinite-scroll.models';
import { IntersectionObserverFactory } from '../observer/intersection-observer.factory';
import { calculateTriggerIndex } from '../strategy/item-threshold.strategy';

@Directive({
  selector: '[sisInfiniteList]',
  standalone: true,
  providers: [IntersectionObserverFactory],
})
export class InfiniteListDirective {
  readonly itemCount = input.required<number>({ alias: 'sisInfiniteList' });
  readonly initialBatchSize = input(30, { alias: 'sisInitialBatchSize' });
  readonly batchSize = input(30, { alias: 'sisBatchSize' });
  readonly progressThreshold = input(0.2, { alias: 'sisProgressThreshold' });
  readonly loading = input(false, { alias: 'sisLoading' });
  readonly disabled = input(false, { alias: 'sisDisabled' });
  readonly completed = input(false, { alias: 'sisCompleted' });
  readonly root = input<Element | null>(null, { alias: 'sisRoot' });
  readonly rootMargin = input('0px', { alias: 'sisRootMargin' });
  readonly intersectionThreshold = input(0, { alias: 'sisIntersectionThreshold' });
  readonly requestKey = input<InfiniteScrollRequestKey>(null, { alias: 'sisRequestKey' });

  readonly loadMore = output<InfiniteScrollRequest>({ alias: 'sisLoadMore' });

  private readonly destroyRef = inject(DestroyRef);
  private readonly observerFactory = inject(IntersectionObserverFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly itemElements = signal<ReadonlyMap<number, Element>>(new Map());

  private observer: IntersectionObserver | null = null;
  private lastRequestKey: InfiniteScrollRequestKey = null;
  private lastRequestedItemCount: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnectObserver());

    effect(() => {
      const requestKey = this.requestKey();
      if (!Object.is(requestKey, this.lastRequestKey)) {
        this.lastRequestKey = requestKey;
        this.lastRequestedItemCount = null;
      }

      const itemCount = this.itemCount();
      const initialBatchSize = this.initialBatchSize();
      const batchSize = this.batchSize();
      const progressThreshold = this.progressThreshold();
      const intersectionThreshold = this.intersectionThreshold();

      this.validateConfiguration(
        itemCount,
        initialBatchSize,
        batchSize,
        progressThreshold,
        intersectionThreshold,
      );
      this.disconnectObserver();

      if (!this.isBrowser || this.disabled() || this.loading() || this.completed()) {
        return;
      }

      if (itemCount === 0) {
        this.emitRequest('initial', initialBatchSize, 0, null);
        return;
      }
      const batchStartIndex =
        this.lastRequestedItemCount !== null && this.lastRequestedItemCount < itemCount
          ? this.lastRequestedItemCount
          : 0;
      const triggerIndex = calculateTriggerIndex(itemCount, batchStartIndex, progressThreshold);
      const target = this.itemElements().get(triggerIndex) ?? null;
      if (!target) {
        return;
      }

      this.observer = this.observerFactory.create(
        (entries) => {
          if (
            entries.some((entry) => this.hasReachedTarget(entry, target, intersectionThreshold))
          ) {
            this.emitPrefetchIfReady(itemCount, triggerIndex);
          }
        },
        {
          root: this.resolveRoot(),
          rootMargin: this.rootMargin(),
          threshold: intersectionThreshold,
        },
      );
      this.observer?.observe(target);
    });
  }

  private hasReachedTarget(
    entry: IntersectionObserverEntry,
    target: Element,
    intersectionThreshold: number,
  ): boolean {
    return (
      entry.target === target &&
      ((entry.isIntersecting && entry.intersectionRatio >= intersectionThreshold) ||
        (entry.rootBounds !== null && entry.boundingClientRect.bottom <= entry.rootBounds.top))
    );
  }

  registerItem(index: number, element: Element): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new RangeError('sisInfiniteListItem must be a non-negative integer.');
    }

    this.itemElements.update((current) => {
      const next = new Map(current);
      next.set(index, element);
      return next;
    });
  }

  unregisterItem(index: number, element: Element): void {
    this.itemElements.update((current) => {
      if (current.get(index) !== element) {
        return current;
      }

      const next = new Map(current);
      next.delete(index);
      return next;
    });
  }

  private emitPrefetchIfReady(observedItemCount: number, triggerIndex: number): void {
    if (
      this.itemCount() !== observedItemCount ||
      this.disabled() ||
      this.loading() ||
      this.completed()
    ) {
      return;
    }

    this.emitRequest('prefetch', this.batchSize(), observedItemCount, triggerIndex);
  }

  private emitRequest(
    reason: InfiniteScrollRequest['reason'],
    requestedCount: number,
    loadedCount: number,
    triggerIndex: number | null,
  ): void {
    if (this.lastRequestedItemCount === loadedCount) {
      return;
    }

    this.lastRequestedItemCount = loadedCount;
    this.disconnectObserver();
    this.loadMore.emit({ reason, requestedCount, loadedCount, triggerIndex });
  }

  private resolveRoot(): Element | null {
    return this.root();
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private validateConfiguration(
    itemCount: number,
    initialBatchSize: number,
    batchSize: number,
    progressThreshold: number,
    intersectionThreshold: number,
  ): void {
    if (!Number.isInteger(itemCount) || itemCount < 0) {
      throw new RangeError('sisInfiniteList must be a non-negative integer.');
    }

    if (!Number.isInteger(initialBatchSize) || initialBatchSize < 1) {
      throw new RangeError('sisInitialBatchSize must be a positive integer.');
    }

    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new RangeError('sisBatchSize must be a positive integer.');
    }

    if (!Number.isFinite(progressThreshold) || progressThreshold <= 0 || progressThreshold > 1) {
      throw new RangeError('sisProgressThreshold must be greater than 0 and at most 1.');
    }

    if (
      !Number.isFinite(intersectionThreshold) ||
      intersectionThreshold < 0 ||
      intersectionThreshold > 1
    ) {
      throw new RangeError('sisIntersectionThreshold must be between 0 and 1.');
    }
  }
}
