import { expect, type TestInfo } from '@playwright/test';
import type AxeBuilder from '@axe-core/playwright';

const KNOWN_A11Y_DEFECTS: Record<string, (html: string) => boolean> = {
  'aria-allowed-attr': (html) => html.startsWith('<form id="popover-trigger-'),
  'color-contrast': (html) =>
    html.includes('>Continue Shopping<') || html.includes('>Add to Cart<'),
};

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
        'popover <form> with unsupported ARIA attributes; color-contrast on empty-cart ' +
        '"Continue Shopping" and PDP "Add to Cart") — tracked upstream, not owned by this suite.',
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
