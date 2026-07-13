export type TargetName = 'staging' | 'canary';
export type PathStyle = 'root' | 'site-locale';

export interface StorefrontTarget {
  readonly name: TargetName;
  readonly label: string;
  readonly baseURL: string;
  readonly pathStyle: PathStyle;
  readonly siteAlias: string;
  readonly locale: string;
  readonly currency: string;
  readonly shortCode: string;
  readonly orgId: string;
  readonly siteId: string;
  readonly publicClientId: string;
  readonly privateClientId: string;
}

export const targetProfiles: Readonly<Record<TargetName, StorefrontTarget>> = {
  staging: {
    name: 'staging',
    label: 'official extra-features E2E storefront',
    baseURL: 'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com',
    pathStyle: 'root',
    siteAlias: 'global',
    locale: 'en-GB',
    currency: 'GBP',
    shortCode: 'kv7kzm78',
    orgId: 'f_ecom_zzrf_001',
    siteId: 'RefArchGlobal',
    publicClientId: '475ad705-e2c1-4808-af78-81661f754511',
    privateClientId: '475ad705-e2c1-4808-af78-81661f754511',
  },
  canary: {
    name: 'canary',
    label: 'public PWA Kit demo',
    baseURL: 'https://pwa-kit.mobify-storefront.com',
    pathStyle: 'site-locale',
    siteAlias: 'global',
    locale: 'en-US',
    currency: 'USD',
    shortCode: 'kv7kzm78',
    orgId: 'f_ecom_zzrf_001',
    siteId: 'RefArchGlobal',
    publicClientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
    privateClientId: '083859f2-5d93-4209-b999-a112266d63a0',
  },
};

const isTargetName = (value: string): value is TargetName =>
  value === 'staging' || value === 'canary';

const override = (input: NodeJS.ProcessEnv, key: string, fallback: string): string =>
  input[key] ?? fallback;

const resolveName = (value: string | undefined): TargetName => {
  const name = value ?? 'staging';
  if (!isTargetName(name)) {
    throw new Error(`Unknown E2E_TARGET "${name}"; expected staging or canary`);
  }
  return name;
};

const resolvePathStyle = (input: NodeJS.ProcessEnv, fallback: PathStyle): PathStyle => {
  const pathStyle = override(input, 'E2E_PATH_STYLE', fallback);
  if (pathStyle === 'root' || pathStyle === 'site-locale') {
    return pathStyle;
  }
  throw new Error(`E2E_PATH_STYLE "${pathStyle}" must be root or site-locale`);
};

export function resolveTarget(input: NodeJS.ProcessEnv = process.env): StorefrontTarget {
  const profile = targetProfiles[resolveName(input.E2E_TARGET)];

  return {
    ...profile,
    baseURL: override(input, 'E2E_BASE_URL', profile.baseURL).replace(/\/+$/, ''),
    pathStyle: resolvePathStyle(input, profile.pathStyle),
    siteAlias: override(input, 'E2E_SITE_ALIAS', profile.siteAlias),
    locale: override(input, 'E2E_LOCALE', profile.locale),
    currency: override(input, 'E2E_CURRENCY', profile.currency),
    shortCode: override(input, 'SFCC_SHORT_CODE', profile.shortCode),
    orgId: override(input, 'SFCC_ORG_ID', profile.orgId),
    siteId: override(input, 'SFCC_SITE_ID', profile.siteId),
    publicClientId: override(input, 'SFCC_PUBLIC_CLIENT_ID', profile.publicClientId),
    privateClientId: override(input, 'SFCC_PRIVATE_CLIENT_ID', profile.privateClientId),
  };
}

export function storefrontPath(target: StorefrontTarget, path = ''): string {
  const suffix = path.replace(/^\/+/, '');
  if (target.pathStyle === 'root') {
    return suffix ? `/${suffix}` : '/';
  }
  const prefix = `/${target.siteAlias}/${target.locale}`;
  return suffix ? `${prefix}/${suffix}` : prefix;
}

export function storefrontUrl(target: StorefrontTarget, path = ''): string {
  return new URL(storefrontPath(target, path), target.baseURL).toString();
}
