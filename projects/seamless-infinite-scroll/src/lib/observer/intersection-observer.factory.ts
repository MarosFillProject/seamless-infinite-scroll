import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable()
export class IntersectionObserverFactory {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  create(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit,
  ): IntersectionObserver | null {
    if (!this.isBrowser) {
      return null;
    }

    const Observer = globalThis.IntersectionObserver;
    if (typeof Observer !== 'function') {
      throw new Error(
        'IntersectionObserver is not available. Provide a polyfill or disable seamless infinite scroll.',
      );
    }

    return new Observer(callback, options);
  }
}
