import type { Page } from '@playwright/test';

interface SupportedLocale {
  id: string;
  preferredCurrency: string;
}

export interface StorefrontAppConfig {
  multishipEnabled: boolean;
  commerceAgent: {
    enabled: string;
    askAgentOnSearch: string;
    enableAgentFromHeader: string;
    enableAgentFromFloatingButton: string;
    enableAgentFromSearchSuggestions: string;
  };
  sfPayments: {
    enabled: boolean;
    sdkUrl: string;
    metadataUrl: string;
  };
  oneClickCheckout: {
    enabled: boolean;
  };
  login: {
    passwordless: { enabled: boolean; mode: string; landingPath: string };
    social: { enabled: boolean; idps: string[]; redirectURI: string };
    resetPassword: { mode: string; landingPath: string };
  };
  sites: {
    id: string;
    l10n: { supportedLocales: SupportedLocale[]; defaultLocale: string };
  }[];
}

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

/**
 * Reads the storefront's own shipped config from the `#mobify-data` script tag —
 * the live source of truth for every feature gate in this suite, never assumed.
 */
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
