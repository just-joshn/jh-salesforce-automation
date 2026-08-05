// Vendors the SCAPI OpenAPI specs this repo tests against into api/specs/.
//
// Salesforce documents SCAPI as OpenAPI 3, but the download button on the docs
// portal needs a browser and the Schemas API needs OAuth with the
// sfcc.scapi-schemas scope. Salesforce's own SDK repo commits the same specs in
// public, so that is what we read: no credentials, works in CI with no secrets.
//
// One directory per API version is published (shopper-baskets-oas-1.11.0), so
// the newest directory for the major version we call is resolved at fetch time
// rather than pinned here. That is what makes the drift check meaningful: when
// Salesforce publishes a new version, the fetched bytes change, the generated
// types change, and the nightly `git diff --exit-code` goes red.
//
// The committed spec is the pin. Nothing fetches at test time.

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'SalesforceCommerceCloud/commerce-sdk-isomorphic';
const REF = 'main';
const SPEC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'api', 'specs');

// The API families this repo actually calls, with the major version it calls.
// Adding a family here is the only change needed to cover a new surface.
const FAMILIES = [
  { name: 'shopper-baskets', major: 1, callAs: 'checkout/shopper-baskets/v1' },
  { name: 'shopper-orders', major: 1, callAs: 'checkout/shopper-orders/v1' },
  { name: 'shopper-customers', major: 1, callAs: 'customer/shopper-customers/v1' },
  { name: 'shopper-products', major: 1, callAs: 'product/shopper-products/v1' },
  { name: 'shopper-search', major: 1, callAs: 'search/shopper-search/v1' },
  { name: 'shopper-stores', major: 1, callAs: 'store/shopper-stores/v1' },
  { name: 'shopper-configurations', major: 1, callAs: 'configuration/shopper-configurations/v1' },
  { name: 'auth', major: 1, callAs: 'shopper/auth/v1' },
];

// GitHub's unauthenticated API allows 60 calls an hour per IP. This makes one.
// A token is used when present so a busy CI runner cannot be rate limited.
function githubHeaders() {
  const headers = { Accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN ?? '';
  if (token.length > 0) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchOk(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${response.status} ${response.statusText}`);
  }
  return response;
}

// Directory names present under apis/ on the tracked ref.
async function listApiDirectories() {
  const response = await fetchOk(`https://api.github.com/repos/${REPO}/contents/apis?ref=${REF}`, {
    headers: githubHeaders(),
  });
  const entries = await response.json();
  return entries.filter((entry) => entry.type === 'dir').map((entry) => entry.name);
}

function parseVersion(text) {
  const parts = text.split('.').map((part) => Number.parseInt(part, 10));
  return parts.length === 3 && parts.every(Number.isInteger) ? parts : null;
}

// Highest published version of one family, within the major version we call.
// Sorting on the numeric triple avoids 1.9.0 beating 1.11.0.
function newestDirectory(directories, family) {
  const prefix = `${family.name}-oas-`;
  const candidates = directories
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, version: parseVersion(name.slice(prefix.length)) }))
    .filter((entry) => entry.version !== null && entry.version[0] === family.major)
    .sort((a, b) => {
      for (let i = 0; i < 3; i += 1) {
        if (a.version[i] !== b.version[i]) return b.version[i] - a.version[i];
      }
      return 0;
    });

  const [newest] = candidates;
  if (!newest) {
    throw new Error(
      `no published spec directory for ${family.name} major ${family.major} — ` +
        `Salesforce may have renamed or retired it`,
    );
  }
  return newest;
}

async function vendorFamily(directories, family) {
  const directory = newestDirectory(directories, family);
  const specPath = `apis/${directory.name}/${family.name}-oas-v${family.major}-public.yaml`;
  const sourceUrl = `https://raw.githubusercontent.com/${REPO}/${REF}/${specPath}`;

  const yaml = await (await fetchOk(sourceUrl)).text();
  if (!yaml.startsWith('openapi:')) {
    throw new Error(`${specPath} does not look like an OpenAPI document`);
  }

  await writeFile(join(SPEC_DIR, `${family.name}.yaml`), yaml, 'utf8');

  return {
    family: family.name,
    callAs: family.callAs,
    version: directory.name.slice(`${family.name}-oas-`.length),
    source: `${REPO}@${REF}:${specPath}`,
    sha256: createHash('sha256').update(yaml).digest('hex'),
    bytes: yaml.length,
  };
}

async function main() {
  await mkdir(SPEC_DIR, { recursive: true });
  const directories = await listApiDirectories();

  // Sequential on purpose: eight small files, and a clean failure line beats a
  // rejected-promise pile-up when Salesforce moves something.
  const manifest = [];
  for (const family of FAMILIES) {
    const entry = await vendorFamily(directories, family);
    manifest.push(entry);
    console.log(`  ${entry.family.padEnd(24)} ${entry.version.padEnd(9)} ${entry.bytes} bytes`);
  }

  // The manifest is what makes a drift failure readable: the yaml diff is tens
  // of thousands of lines, this is one line per family.
  await writeFile(
    join(SPEC_DIR, 'MANIFEST.json'),
    `${JSON.stringify({ repo: REPO, ref: REF, specs: manifest }, null, 2)}\n`,
    'utf8',
  );

  console.log(`\nVendored ${manifest.length} specs into api/specs/. Run \`pnpm gen:api\` next.`);
}

await main();
