import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type TestInfo } from '@playwright/test';

export const test = base.extend<{
  makeAxeBuilder: () => AxeBuilder;
}>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']),
    );
  },
});

export { expect };

/**
 * Confirmed, unfixed defects in the live storefront (not owned by this repo — Salesforce's
 * PWA Kit reference app) that axe-core correctly flags on every run. Filtered per-node by rule
 * id and a stable HTML fragment — never via AxeBuilder.disableRules(), which would blind the
 * whole rule everywhere — so a genuinely new violation of the same rule elsewhere still fails.
 */
const KNOWN_A11Y_DEFECTS: Record<string, (html: string) => boolean> = {
  // Header popover trigger renders as a <form>, whose implicit role doesn't support these ARIA
  // attributes. Present on every page; the DOM id carries a volatile React-generated suffix.
  'aria-allowed-attr': (html) => html.startsWith('<form id="popover-trigger-'),
  // "Continue Shopping" link on the empty-cart state fails minimum color contrast.
  'color-contrast': (html) => html.includes('>Continue Shopping<'),
};

/** Analyzes with the same tagged AxeBuilder every a11y test gets via the `makeAxeBuilder` fixture. */
export async function assertNoA11yViolations(
  makeAxeBuilder: () => AxeBuilder,
  testInfo: TestInfo,
): Promise<void> {
  const results = await makeAxeBuilder().analyze();
  let excludedCount = 0;
  const violations = results.violations
    .map((violation) => {
      const isKnownDefect = KNOWN_A11Y_DEFECTS[violation.id];
      const nodes = violation.nodes.filter((node) => {
        const known = isKnownDefect?.(node.html) ?? false;
        if (known) excludedCount += 1;
        return !known;
      });
      return {
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        nodes: nodes.map((node) => ({ html: node.html, target: node.target })),
      };
    })
    .filter((violation) => violation.nodes.length > 0);

  if (excludedCount > 0) {
    testInfo.annotations.push({
      type: 'known-defect',
      description:
        `Excluded ${excludedCount} node(s) matching confirmed storefront defects (header ` +
        'popover <form> with unsupported ARIA attributes; color-contrast on the empty-cart ' +
        '"Continue Shopping" link) — tracked upstream, not owned by this suite.',
    });
  }

  if (violations.length > 0) {
    await testInfo.attach('accessibility-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
  }

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
