import { Component, signal } from '@angular/core';
import {
  InfiniteListDirective,
  InfiniteListItemDirective,
  InfiniteScrollRequest,
} from 'seamless-infinite-scroll';

interface DemoItem {
  readonly id: number;
  readonly title: string;
  readonly description: string;
}

interface ListState {
  readonly items: ReturnType<typeof signal<DemoItem[]>>;
  readonly loading: ReturnType<typeof signal<boolean>>;
  readonly completed: ReturnType<typeof signal<boolean>>;
  readonly error: ReturnType<typeof signal<string | null>>;
  readonly requestKey: ReturnType<typeof signal<number>>;
  readonly failNext: ReturnType<typeof signal<boolean>>;
}

@Component({
  selector: 'app-root',
  imports: [InfiniteListDirective, InfiniteListItemDirective],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly initialBatchSize = 30;
  protected readonly batchSize = 20;
  protected readonly progressThreshold = 0.5;

  protected readonly pageList = this.createListState();
  protected readonly containerList = this.createListState();

  protected loadPageItems(request: InfiniteScrollRequest): void {
    this.loadItems(this.pageList, request, 150);
  }

  protected loadContainerItems(request: InfiniteScrollRequest): void {
    this.loadItems(this.containerList, request, 120);
  }

  protected retry(state: ListState): void {
    state.error.set(null);
    state.requestKey.update((key) => key + 1);
  }

  protected simulateFailure(state: ListState): void {
    state.failNext.set(true);
  }

  private createListState(): ListState {
    return {
      items: signal<DemoItem[]>([]),
      loading: signal(false),
      completed: signal(false),
      error: signal<string | null>(null),
      requestKey: signal(0),
      failNext: signal(false),
    };
  }

  private loadItems(state: ListState, request: InfiniteScrollRequest, maximum: number): void {
    if (state.loading() || state.completed()) {
      return;
    }

    state.loading.set(true);
    state.error.set(null);

    window.setTimeout(() => {
      if (state.failNext()) {
        state.failNext.set(false);
        state.loading.set(false);
        state.error.set('The simulated request failed. Retry when you are ready.');
        return;
      }

      const currentCount = state.items().length;
      const remaining = Math.max(0, maximum - currentCount);
      const count = Math.min(request.requestedCount, remaining);
      const nextItems = Array.from({ length: count }, (_, offset) =>
        this.createItem(currentCount + offset),
      );

      state.items.update((items) => [...items, ...nextItems]);
      state.completed.set(currentCount + count >= maximum);
      state.loading.set(false);
    }, 650);
  }

  private createItem(index: number): DemoItem {
    const itemNumber = index + 1;
    return {
      id: itemNumber,
      title: `Item ${itemNumber}`,
      description: `Loaded in the background as part of the infinite list.`,
    };
  }
}
