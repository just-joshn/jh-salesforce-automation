import type { Locator, Page } from '@playwright/test';

// --- The storefront's own ways in to the shopping agent ---
// Only these are storefront DOM. The conversation window belongs to the provider:
// an Embedded Messaging iframe, or the Commerce Client widget injected into the
// container below. Nothing here reaches inside it.

export const headerAgentButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Ask Shopping Agent', exact: true });

// The search entry carries its own strapline in its assistive label, so it is
// matched by the label it starts with, not the whole sentence.
export const askAgentFromSearch = (page: Page): Locator =>
  page.getByRole('button', { name: /^Ask Shopping Agent - / });

export const commerceClientWidget = (page: Page): Locator =>
  page.getByTestId('commerce-client-agent-widget');

// --- Search, which is one of the contexts an agent can be opened from ---

export const searchInput = (page: Page): Locator =>
  page.getByPlaceholder('Search for products...').filter({ visible: true }).first();

export const searchSuggestions = (page: Page): Locator =>
  page.getByTestId('sf-suggestion-popover').filter({ visible: true }).first();

// The popover carries one suggestion group per breakpoint and hides the ones that
// do not apply, so only the visible groups are the ones a shopper is being offered.
export const searchSuggestion = (page: Page): Locator =>
  searchSuggestions(page).getByTestId('sf-suggestion').filter({ visible: true }).first();
