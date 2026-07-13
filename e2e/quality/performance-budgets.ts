import type { Page } from '@playwright/test';

export interface PerformanceBudget {
  ttfb: number;
  domContentLoaded: number;
  lcp: number;
  cls: number;
  transferredBytes: number;
}

export interface PerformanceMetrics {
  ttfb: number;
  domContentLoaded: number;
  lcp: number | null;
  cls: number;
  transferredBytes: number;
}

export const budgets: Record<'home' | 'search', PerformanceBudget> = {
  home: {
    ttfb: 1_500,
    domContentLoaded: 5_000,
    lcp: 4_000,
    cls: 0.25,
    transferredBytes: 6 * 1024 * 1024,
  },
  search: {
    ttfb: 1_500,
    domContentLoaded: 6_000,
    lcp: 4_500,
    cls: 0.25,
    transferredBytes: 7 * 1024 * 1024,
  },
};

interface ObservedMetrics {
  lcp: number | null;
  cls: number;
}

interface WindowWithObservedMetrics extends Window {
  __storefrontPerformance?: ObservedMetrics;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

export async function observePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const observed: ObservedMetrics = { lcp: null, cls: 0 };
    (window as WindowWithObservedMetrics).__storefrontPerformance = observed;

    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) observed.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    const shiftValue = (entry: LayoutShiftEntry): number =>
      entry.hadRecentInput ? 0 : (entry.value ?? 0);
    new PerformanceObserver((list) => {
      observed.cls += (list.getEntries() as LayoutShiftEntry[]).reduce(
        (sum, entry) => sum + shiftValue(entry),
        0,
      );
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

export async function measurePage(page: Page): Promise<PerformanceMetrics> {
  await page.waitForLoadState('load');
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (!navigation) {
      throw new Error('No navigation timing entry was recorded');
    }

    const observed = (window as WindowWithObservedMetrics).__storefrontPerformance;
    if (!observed) {
      throw new Error('Performance observers were not installed');
    }
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    return {
      ttfb: navigation.responseStart - navigation.requestStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      lcp: observed.lcp,
      cls: observed.cls,
      transferredBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    };
  });
}
