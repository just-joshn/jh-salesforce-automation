// Verifies the api/ suite mirrors e2e/tests test-for-test: same spec-file basenames,
// same number of tests per file, identical titles in the same order. "Same journey,
// API requests instead of UI clicks" is only true if the titles line up — this check
// makes that contract executable instead of aspirational.

import fs from 'node:fs';
import path from 'node:path';

const titleRe = /(?:^|\n)\s*test\(\s*(['"])(.*?)\1/g;
const sectionRe = /(?:^|\n)\s*test\.describe\(\s*(['"])(.*?)\1/g;
const tagRe = /tag:\s*(?:(['"])(.*?)\1|\[([^\]]*)\])/g;
const stringRe = /(['"])(.*?)\1/g;

const metadataIn = (file) => {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const tags = [];
  for (const match of text.matchAll(tagRe)) {
    if (match[2] !== undefined) {
      tags.push(match[2]);
    } else {
      tags.push(...[...match[3].matchAll(stringRe)].map((tag) => tag[2]));
    }
  }
  return {
    titles: [...text.matchAll(titleRe)].map((match) => match[2]),
    sections: [...text.matchAll(sectionRe)].map((match) => match[2]),
    tags,
  };
};

const specFiles = (root) =>
  fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => entry.name)
    .sort();

const formatList = (titles) =>
  titles.length === 0 ? '  (none)' : titles.map((t) => `  - ${t}`).join('\n');

const diffValues = (label, e2eValues, apiValues) => {
  const lines = [];
  const max = Math.max(e2eValues.length, apiValues.length);
  for (let i = 0; i < max; i++) {
    const e = e2eValues[i];
    const a = apiValues[i];
    if (e === a) continue;
    if (e === undefined) lines.push(`  + api only ${label} [${i}]: ${a}`);
    else if (a === undefined) lines.push(`  - e2e only ${label} [${i}]: ${e}`);
    else lines.push(`  ~ ${label} [${i}]\n      e2e: ${e}\n      api: ${a}`);
  }
  return lines.join('\n');
};

let failed = false;
const e2eFiles = specFiles('e2e/tests');
const apiFiles = specFiles('api/tests');

const e2eSet = new Set(e2eFiles);
const apiSet = new Set(apiFiles);
const allFiles = [...new Set([...e2eFiles, ...apiFiles])].sort();

for (const file of allFiles) {
  const inE2e = e2eSet.has(file);
  const inApi = apiSet.has(file);

  if (!inE2e || !inApi) {
    failed = true;
    const side = inE2e ? 'api/tests' : 'e2e/tests';
    console.error(`spec file "${file}": missing under ${side}`);
    continue;
  }

  const e2eMetadata = metadataIn(path.join('e2e/tests', file));
  const apiMetadata = metadataIn(path.join('api/tests', file));

  if (e2eMetadata === null || apiMetadata === null) {
    failed = true;
    console.error(`spec file "${file}": could not read metadata`);
    continue;
  }

  const checks = [
    ['section', e2eMetadata.sections, apiMetadata.sections],
    ['tag', e2eMetadata.tags, apiMetadata.tags],
    ['title', e2eMetadata.titles, apiMetadata.titles],
  ];
  const mismatches = checks.filter(
    ([, e2eValues, apiValues]) =>
      e2eValues.length !== apiValues.length || e2eValues.some((value, i) => value !== apiValues[i]),
  );

  if (mismatches.length > 0) {
    failed = true;
    console.error(`spec file "${file}": metadata mismatch`);
    for (const [label, e2eValues, apiValues] of mismatches) {
      console.error(`  ${label} e2e (${e2eValues.length}):\n${formatList(e2eValues)}`);
      console.error(`  ${label} api (${apiValues.length}):\n${formatList(apiValues)}`);
      console.error(`  ${label} diff:\n${diffValues(label, e2eValues, apiValues)}`);
    }
  }
}

if (!failed) {
  console.log(`title parity ok: ${allFiles.length} spec files`);
}

process.exit(failed ? 1 : 0);
