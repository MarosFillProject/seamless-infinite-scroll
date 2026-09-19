# Seamless Infinite Scroll

A headless Angular library that requests the next data batch before a user reaches the end of an
infinite list.

Instead of observing an end-of-list sentinel, the library observes the rendered item at a
configurable position in the latest appended batch. With an initial batch of 30 items and the
default `0.2` progress threshold, item index 6 triggers the next request. If 20 more items are then
appended, index 34 is the next trigger. The application can therefore load and append data in the
background while the user is still moving through existing content. If fast scrolling has already
moved past a newly selected trigger, the directive treats it as reached so loading continues
without requiring the user to scroll backward.

## Architecture

The package exposes two standalone directives:

- `InfiniteListDirective` coordinates request state and observes the current trigger item.
- `InfiniteListItemDirective` registers each rendered item and its collection index.

The library intentionally does not fetch data, render items, display loading UI, or virtualize the
DOM. The consuming application owns API calls, state, errors, retries, and appending results.

`IntersectionObserver` is created behind an injectable, platform-aware factory. Server rendering
does not access browser globals or emit load requests; observation starts after hydration.

## Source usage

This repository is currently intended for source-based consumption rather than registry
publication.

```bash
npm install
npm run build:library
```

Point a consuming workspace at `dist/seamless-infinite-scroll`, use a local file dependency, or
include this repository in a larger workspace. All supported imports are exported from the package
entry point:

```ts
import {
  InfiniteListDirective,
  InfiniteListItemDirective,
  InfiniteScrollRequest,
} from 'seamless-infinite-scroll';
```

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  InfiniteListDirective,
  InfiniteListItemDirective,
  InfiniteScrollRequest,
} from 'seamless-infinite-scroll';

@Component({
  imports: [InfiniteListDirective, InfiniteListItemDirective],
  template: `
    <div
      [sisInfiniteList]="items().length"
      [sisInitialBatchSize]="30"
      [sisBatchSize]="20"
      [sisProgressThreshold]="0.2"
      [sisLoading]="loading()"
      [sisCompleted]="completed()"
      [sisRequestKey]="requestKey()"
      (sisLoadMore)="load($event)"
    >
      @for (item of items(); track item.id; let index = $index) {
        <article [sisInfiniteListItem]="index">{{ item.title }}</article>
      }
    </div>
  `,
})
export class ResultsComponent {
  readonly items = signal<{ id: number; title: string }[]>([]);
  readonly loading = signal(false);
  readonly completed = signal(false);
  readonly requestKey = signal(0);

  async load(request: InfiniteScrollRequest): Promise<void> {
    this.loading.set(true);

    try {
      const next = await fetchItems({
        offset: request.loadedCount,
        limit: request.requestedCount,
      });
      this.items.update((items) => [...items, ...next.items]);
      this.completed.set(!next.hasMore);
    } finally {
      this.loading.set(false);
    }
  }
}
```

When the list is empty, the directive emits one `initial` request with `sisInitialBatchSize`.
Subsequent trigger items emit `prefetch` requests with `sisBatchSize`.

Trigger placement uses the actual increase in `sisInfiniteList` after the previous request, not the
requested batch size. For example, when the item count increases from 70 to 90, the default `0.2`
threshold selects index 74 (Item 75). If the application appends fewer items than requested, the
trigger adjusts to the same relative position in that smaller batch.

## Scrollable container

Pass an element as `sisRoot` to use it as the `IntersectionObserver` root:

```html
<div
  #container
  class="scroll-container"
  [sisInfiniteList]="items().length"
  [sisRoot]="container"
  (sisLoadMore)="load($event)"
>
  @for (item of items(); track item.id; let index = $index) {
  <article [sisInfiniteListItem]="index">{{ item.title }}</article>
  }
</div>
```

Without `sisRoot`, the browser viewport is used.

## Inputs

| Input                      |  Default | Purpose                                                                |
| -------------------------- | -------: | ---------------------------------------------------------------------- |
| `sisInfiniteList`          | required | Number of currently loaded items.                                      |
| `sisInitialBatchSize`      |     `30` | Requested count for an empty list.                                     |
| `sisBatchSize`             |     `30` | Requested count for subsequent prefetches.                             |
| `sisProgressThreshold`     |    `0.2` | Position in the latest appended batch that triggers prefetch.          |
| `sisLoading`               |  `false` | Prevents requests while an API call is active.                         |
| `sisCompleted`             |  `false` | Permanently stops requests for the current list.                       |
| `sisDisabled`              |  `false` | Temporarily disables requests and observation.                         |
| `sisRoot`                  |   `null` | Scroll container element; `null` uses the viewport.                    |
| `sisRootMargin`            |    `0px` | Native `IntersectionObserver` root margin.                             |
| `sisIntersectionThreshold` |      `0` | Visible fraction required for the trigger item.                        |
| `sisRequestKey`            |   `null` | Change to reset request deduplication after a failure or query change. |

## Output

`sisLoadMore` emits:

```ts
interface InfiniteScrollRequest {
  reason: 'initial' | 'prefetch';
  requestedCount: number;
  loadedCount: number;
  triggerIndex: number | null;
}
```

Only one request is emitted for a given loaded item count within a `sisRequestKey` lifecycle. If a
request fails and no items are appended, clear the application's loading state and change
`sisRequestKey` to explicitly retry. The same reset mechanism can start a new list lifecycle after
changing filters or search terms.

## Limitations

- Loaded items remain in the DOM. For extremely large rendered collections, integrate a dedicated
  virtualization solution such as Angular CDK virtual scroll.
- Browsers must provide `IntersectionObserver`; add a polyfill when targeting an environment that
  does not.
- The trigger is based on position in the latest appended batch, not scrollable pixel distance.
  This keeps batch timing deterministic when item heights differ.

## Development

```bash
npm install
npm test
npm run build
```

Run the library watcher and demo server in separate terminals:

```bash
npm start
npm run start:demo
```
