import { Directive, effect, ElementRef, inject, input } from '@angular/core';

import { InfiniteListDirective } from './infinite-list.directive';

@Directive({
  selector: '[sisInfiniteListItem]',
  standalone: true,
})
export class InfiniteListItemDirective {
  readonly index = input.required<number>({ alias: 'sisInfiniteListItem' });

  private readonly element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private readonly list = inject(InfiniteListDirective, { skipSelf: true });

  constructor() {
    effect((onCleanup) => {
      const index = this.index();
      this.list.registerItem(index, this.element);
      onCleanup(() => this.list.unregisterItem(index, this.element));
    });
  }
}
