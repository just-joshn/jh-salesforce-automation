export interface SupportedLocale {
  id: string;
  preferredCurrency: string;
}

/** Live `#mobify-data` app config. Shared by the e2e page reader and the API HTML reader. */
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
