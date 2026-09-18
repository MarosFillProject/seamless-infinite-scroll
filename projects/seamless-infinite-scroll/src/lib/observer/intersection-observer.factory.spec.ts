import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IntersectionObserverFactory } from './intersection-observer.factory';

describe('IntersectionObserverFactory', () => {
  it('does not access browser APIs during server rendering', () => {
    TestBed.configureTestingModule({
      providers: [IntersectionObserverFactory, { provide: PLATFORM_ID, useValue: 'server' }],
    });

    const factory = TestBed.inject(IntersectionObserverFactory);
    expect(factory.create(() => undefined, {})).toBeNull();
  });

  it('surfaces a missing browser implementation', () => {
    const originalObserver = globalThis.IntersectionObserver;
    Reflect.deleteProperty(globalThis, 'IntersectionObserver');

    try {
      TestBed.configureTestingModule({
        providers: [IntersectionObserverFactory],
      });

      const factory = TestBed.inject(IntersectionObserverFactory);
      expect(() => factory.create(() => undefined, {})).toThrowError(
        /IntersectionObserver is not available/,
      );
    } finally {
      globalThis.IntersectionObserver = originalObserver;
    }
  });
});
