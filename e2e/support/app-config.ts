import type { Page } from '@playwright/test';
import type { StorefrontAppConfig } from '../../support/storefront-config';

export type { StorefrontAppConfig };

const configOffDefault = (value: string | undefined): string => value ?? 'false';

function normalizeAppConfig(config: StorefrontAppConfig): StorefrontAppConfig {
  return {
    ...config,
    commerceAgent: {
      ...config.commerceAgent,
      enabled: configOffDefault(config.commerceAgent.enabled),
      askAgentOnSearch: configOffDefault(config.commerceAgent.askAgentOnSearch),
      enableAgentFromHeader: configOffDefault(config.commerceAgent.enableAgentFromHeader),
      enableAgentFromFloatingButton: configOffDefault(
        config.commerceAgent.enableAgentFromFloatingButton,
      ),
      enableAgentFromSearchSuggestions: configOffDefault(
        config.commerceAgent.enableAgentFromSearchSuggestions,
      ),
    },
  };
}

export async function readAppConfig(page: Page): Promise<StorefrontAppConfig> {
  const app = await page.evaluate(() => {
    const el = document.getElementById('mobify-data');
    if (!el?.textContent) {
      return null;
    }
    const parsed = JSON.parse(el.textContent) as { __CONFIG__?: { app?: unknown } };
    return parsed.__CONFIG__?.app ?? null;
  });
  if (!app) {
    throw new Error(
      'Could not read #mobify-data config from the page — the storefront config contract may have changed.',
    );
  }
  return normalizeAppConfig(app as StorefrontAppConfig);
}
