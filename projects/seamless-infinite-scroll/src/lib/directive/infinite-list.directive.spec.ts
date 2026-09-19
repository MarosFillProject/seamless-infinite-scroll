import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfiniteScrollRequest } from '../models/infinite-scroll.models';
import { InfiniteListItemDirective } from './infinite-list-item.directive';
import { InfiniteListDirective } from './infinite-list.directive';

class FakeIntersectionObserver implements IntersectionObserver {
  static latest: FakeIntersectionObserver | null = null;

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  observed: Element | null = null;
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    FakeIntersectionObserver.latest = this;
  }

  disconnect(): void {
    this.disconnected = true;
    this.observed = null;
  }

  observe(target: Element): void {
    this.observed = target;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    if (this.observed === target) {
      this.observed = null;
    }
  }

  trigger(
    isIntersecting = true,
    boundingClientRect?: DOMRectReadOnly,
    rootBounds: DOMRectReadOnly | null = null,
    intersectionRatio = isIntersecting ? 1 : 0,
  ): void {
    if (!this.observed) {
      throw new Error('No element is being observed.');
    }

    const target = this.observed;
    const targetRect = boundingClientRect ?? target.getBoundingClientRect();
    this.callback(
      [
        {
          boundingClientRect: targetRect,
          intersectionRatio,
          intersectionRect: targetRect,
          isIntersecting,
          rootBounds,
          target,
          time: 0,
        },
      ],
      this,
    );
  }
}

function createRect(top: number, bottom: number): DOMRectReadOnly {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 100,
    top,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

@Component({
  imports: [InfiniteListDirective, InfiniteListItemDirective],
  template: `
    <div
      [sisInfiniteList]="items().length"
      [sisInitialBatchSize]="initialBatchSize"
      [sisBatchSize]="batchSize"
      [sisIntersectionThreshold]="intersectionThreshold"
      [sisLoading]="loading()"
      [sisCompleted]="completed()"
      [sisRequestKey]="requestKey()"
      (sisLoadMore)="requests.push($event)"
    >
      @for (item of items(); track item; let index = $index) {
        <div [sisInfiniteListItem]="index">{{ item }}</div>
      }
    </div>
  `,
})
class TestHost {
  readonly items = signal<number[]>([]);
  readonly loading = signal(false);
  readonly completed = signal(false);
  readonly requestKey = signal(0);
  readonly requests: InfiniteScrollRequest[] = [];

  initialBatchSize = 30;
  batchSize = 20;
  intersectionThreshold = 0;
}

describe('InfiniteListDirective', () => {
  let fixture: ComponentFixture<TestHost>;
  let originalObserver: typeof IntersectionObserver | undefined;

  beforeEach(async () => {
    originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    FakeIntersectionObserver.latest = null;

    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver as typeof IntersectionObserver;
  });

  it('automatically requests the configured initial batch', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.requests).toEqual([
      {
        reason: 'initial',
        requestedCount: 30,
        loadedCount: 0,
        triggerIndex: null,
      },
    ]);
  });

  it('observes the default 20% position and requests the configured subsequent batch', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const observer = FakeIntersectionObserver.latest;
    expect(observer?.observed?.textContent).toBe('6');

    observer?.trigger();

    expect(fixture.componentInstance.requests.at(-1)).toEqual({
      reason: 'prefetch',
      requestedCount: 20,
      loadedCount: 30,
      triggerIndex: 6,
    });
    expect(fixture.componentInstance.requests).toHaveLength(2);
  });

  it('moves the trigger to 20% of the latest appended batch', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    await fixture.whenStable();
    FakeIntersectionObserver.latest?.trigger();

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    fixture.componentInstance.items.set(Array.from({ length: 50 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(FakeIntersectionObserver.latest?.observed?.textContent).toBe('34');
  });

  it('uses the actual appended count when a batch is shorter than requested', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    await fixture.whenStable();
    FakeIntersectionObserver.latest?.trigger();

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    fixture.componentInstance.items.set(Array.from({ length: 37 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(FakeIntersectionObserver.latest?.observed?.textContent).toBe('31');

    FakeIntersectionObserver.latest?.trigger(false, createRect(-100, -50), createRect(0, 500));

    expect(fixture.componentInstance.requests.at(-1)).toEqual({
      reason: 'prefetch',
      requestedCount: 20,
      loadedCount: 37,
      triggerIndex: 31,
    });
    expect(fixture.componentInstance.requests).toHaveLength(3);
  });

  it('requests another batch when the trigger is already above the root', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    FakeIntersectionObserver.latest?.trigger(false, createRect(-100, -50), createRect(0, 500));

    expect(fixture.componentInstance.requests.at(-1)).toEqual({
      reason: 'prefetch',
      requestedCount: 20,
      loadedCount: 30,
      triggerIndex: 6,
    });
    expect(fixture.componentInstance.requests).toHaveLength(2);
  });

  it('does not request another batch when the trigger is below the root', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    FakeIntersectionObserver.latest?.trigger(false, createRect(550, 600), createRect(0, 500));

    expect(fixture.componentInstance.requests).toHaveLength(1);
  });

  it('waits for the configured intersection threshold', async () => {
    fixture.componentInstance.intersectionThreshold = 0.75;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const observer = FakeIntersectionObserver.latest;
    expect(observer?.thresholds).toEqual([0.75]);

    observer?.trigger(true, undefined, null, 0.5);
    expect(fixture.componentInstance.requests).toHaveLength(1);

    observer?.trigger(true, undefined, null, 0.75);
    expect(fixture.componentInstance.requests).toHaveLength(2);
  });

  it('disconnects the active observer when destroyed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.items.set(Array.from({ length: 30 }, (_, index) => index));
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const observer = FakeIntersectionObserver.latest;
    expect(observer?.observed).not.toBeNull();

    fixture.destroy();

    expect(observer?.disconnected).toBe(true);
    expect(observer?.observed).toBeNull();
  });

  it('allows an application-controlled retry when the request key changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.requests).toHaveLength(1);

    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.requests).toHaveLength(1);

    fixture.componentInstance.requestKey.update((value) => value + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.requests).toHaveLength(2);
  });

  it('does not request more items after completion', async () => {
    fixture.componentInstance.completed.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.requests).toEqual([]);
    expect(FakeIntersectionObserver.latest).toBeNull();
  });
});
