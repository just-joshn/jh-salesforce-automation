import { resolveTarget, storefrontUrl } from '../support/targets.ts';
import { STORE_FACTS } from '../support/test-data.ts';

const target = resolveTarget();
const fail = (message) => {
  console.error(`Target preflight failed: ${message}`);
  process.exitCode = 1;
};

const organizationPath = (resourcePath) =>
  `organizations/${target.orgId}/${resourcePath.replace(/^\/+/, '')}`;
const apiUrl = (family, resourcePath) =>
  `${target.baseURL}/mobify/proxy/api/${family}/${organizationPath(resourcePath)}`;
const slasUrl = (resourcePath) =>
  `${target.baseURL}/mobify/slas/private/shopper/auth/v1/${organizationPath(resourcePath)}`;
const basic = Buffer.from(
  `${target.privateClientId}:_PLACEHOLDER_PROXY-PWA_KIT_SLAS_CLIENT_SECRET`,
).toString('base64');

const root = await fetch(storefrontUrl(target));
if (!root.ok) {
  fail(`root document returned HTTP ${root.status}`);
  process.exit();
}
const html = await root.text();
const match = html.match(/<script\b[^>]*\bid=(['"])mobify-data\1[^>]*>([\s\S]*?)<\/script>/i);
if (!match) {
  fail('root document has no mobify-data script');
  process.exit();
}

const app = JSON.parse(match[2]).__CONFIG__?.app;
const commerce = app?.commerceAPI?.parameters;
if (commerce?.organizationId !== target.orgId || commerce?.siteId !== target.siteId) {
  fail(
    `commerce config was org=${commerce?.organizationId ?? '<missing>'}, site=${commerce?.siteId ?? '<missing>'}`,
  );
}
if (app?.defaultSite !== target.siteId) {
  fail(`default site was ${app?.defaultSite ?? '<missing>'}`);
}
const site = app?.sites?.find((candidate) => candidate.id === target.siteId);
const supportedLocales = site?.l10n?.supportedLocales ?? [];
if (!supportedLocales.some((locale) => locale.id === target.locale)) {
  fail(`locale ${target.locale} is not advertised for ${target.siteId}`);
}
if (!supportedLocales.some((locale) => locale.preferredCurrency === target.currency)) {
  fail(`currency ${target.currency} is not advertised for ${target.siteId}`);
}

const tokenResponse = await fetch(slasUrl('oauth2/token'), {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    channel_id: target.siteId,
    dnt: 'true',
  }),
});
if (!tokenResponse.ok) {
  fail(`private SLAS token proxy returned HTTP ${tokenResponse.status}`);
  process.exit();
}
const token = (await tokenResponse.json()).access_token;
if (typeof token !== 'string' || token.length === 0) {
  fail('private SLAS token response had no access_token');
  process.exit();
}

const storeSearch = new URL(apiUrl('store/shopper-stores/v1', 'store-search'));
storeSearch.search = new URLSearchParams({
  postalCode: STORE_FACTS.locatorPostalCode,
  countryCode: 'US',
  distanceUnit: 'km',
  maxDistance: '100',
  limit: '200',
  siteId: target.siteId,
  locale: target.locale,
}).toString();
const storesResponse = await fetch(storeSearch, {
  headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
});
if (!storesResponse.ok) {
  fail(`store-search returned HTTP ${storesResponse.status}`);
  process.exit();
}
const stores = await storesResponse.json();
if (!Array.isArray(stores.data) || stores.data.length === 0) {
  fail('store-search returned no seeded stores');
  process.exit();
}

console.log(
  `Target ready: ${target.name} ${target.baseURL} (${target.orgId}/${target.siteId}, ${target.locale}, ${target.currency}); stores=${stores.data.length}`,
);
