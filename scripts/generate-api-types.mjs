// Generates TypeScript types from the vendored SCAPI specs in api/specs/.
//
// The output is committed. That keeps `pnpm test` a single step with no codegen
// in front of it. It also makes an upstream shape change arrive as a reviewable
// diff, and gives the nightly drift check something to compare against.
//
// Plain .ts, not .d.ts, so the files import like any other module and
// tsc checks them with everything else.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_DIR = join(ROOT, 'api', 'specs');
const OUT_DIR = join(ROOT, 'api', 'generated');

async function readManifest() {
  try {
    return JSON.parse(await readFile(join(SPEC_DIR, 'MANIFEST.json'), 'utf8'));
  } catch {
    throw new Error('api/specs/MANIFEST.json is missing. Run `pnpm gen:api:fetch` first');
  }
}

function header(entry) {
  return [
    '// Generated from the vendored SCAPI OpenAPI spec. Do not edit by hand.',
    '//',
    `// Family:  ${entry.family} (called as ${entry.callAs})`,
    `// Version: ${entry.version}`,
    `// Source:  ${entry.source}`,
    '//',
    '// Regenerate with `pnpm gen:api:fetch && pnpm gen:api`.',
    '',
    '',
  ].join('\n');
}

async function generate(entry) {
  const specUrl = pathToFileURL(join(SPEC_DIR, `${entry.family}.yaml`));
  const ast = await openapiTS(specUrl);
  const body = astToString(ast);
  const outPath = join(OUT_DIR, `${entry.family}.ts`);
  await writeFile(outPath, header(entry) + body, 'utf8');
  return { family: entry.family, lines: body.split('\n').length };
}

async function main() {
  const manifest = await readManifest();
  await mkdir(OUT_DIR, { recursive: true });

  for (const entry of manifest.specs) {
    const result = await generate(entry);
    console.log(`  ${result.family.padEnd(24)} ${String(result.lines).padStart(6)} lines`);
  }

  console.log(`\nGenerated ${manifest.specs.length} type modules into api/generated/.`);
}

await main();
