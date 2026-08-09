import type { Locator, Page } from '@playwright/test';

export const headerAgentEntry = (page: Page): Locator =>
  page.getByRole('banner').getByRole('button', { name: 'Ask Shopping Agent', exact: true });

// Embedded Messaging owns this non-semantic launch control and exposes no stable accessible name.
export const miawAgentEntry = (page: Page): Locator =>
  page.locator('button.embeddedMessagingConversationButton');

export const commerceClientAgentEntry = (page: Page): Locator =>
  page.getByTestId('commerce-client-fab');

export const agentEntry = (page: Page): Locator =>
  headerAgentEntry(page).or(miawAgentEntry(page)).or(commerceClientAgentEntry(page));

export const agentWidgetContainer = (page: Page): Locator => page.getByTestId('shopper-agent');

export const searchBox = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Search for products...', exact: true });

export const searchSuggestionDialog = (page: Page): Locator => page.getByRole('dialog');

export const productSuggestionLinks = (page: Page, searchTerm: string): Locator =>
  searchSuggestionDialog(page).getByRole('link', { name: new RegExp(searchTerm, 'i') });

export const askAgentSearchEntry = (page: Page): Locator =>
  searchSuggestionDialog(page).getByRole('button', { name: /^Ask Shopping Agent/ });

export const storefrontHeader = (page: Page): Locator => page.getByRole('banner');

export const cartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^My cart, number of items: \d+$/ });
