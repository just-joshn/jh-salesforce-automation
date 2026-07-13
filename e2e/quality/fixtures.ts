import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page, type TestInfo } from '@playwright/test';

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

export async function assertNoA11yViolations(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({ html: node.html, target: node.target })),
  }));

  if (violations.length > 0) {
    await testInfo.attach('accessibility-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
  }

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
