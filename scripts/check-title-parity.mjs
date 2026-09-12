
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const titleRe = /(?:^|\n)\s*test(?:\.(?:only|skip|fixme|fail|slow))?\(\s*(['"])(.*?)\1/g;
export const metadataIn = (file) => {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  return {
    titles: [...text.matchAll(titleRe)].map((match) => match[2]),
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

export const missingTitles = (e2eTitles, apiTitles) => {
  const available = new Map();
  for (const title of apiTitles) available.set(title, (available.get(title) ?? 0) + 1);
  const missing = [];
  for (const title of e2eTitles) {
    const count = available.get(title) ?? 0;
    if (count === 0) missing.push(title);
    else available.set(title, count - 1);
  }
  return missing;
};

export const checkTitleParity = (e2eRoot = 'e2e/tests', apiRoot = 'api/tests') => {
  let failed = false;
  const e2eFiles = specFiles(e2eRoot);
  const apiFiles = specFiles(apiRoot);

  const e2eSet = new Set(e2eFiles);
  const apiSet = new Set(apiFiles);
  const allFiles = [...new Set([...e2eFiles, ...apiFiles])].sort();

  for (const file of allFiles) {
    const inE2e = e2eSet.has(file);
    const inApi = apiSet.has(file);

    if (!inE2e) {
      continue;
    }
    if (!inApi) {
      failed = true;
      console.error(`spec file "${file}": missing under api/tests`);
      continue;
    }

    const e2eMetadata = metadataIn(path.join(e2eRoot, file));
    const apiMetadata = metadataIn(path.join(apiRoot, file));

    if (e2eMetadata === null || apiMetadata === null) {
      failed = true;
      console.error(`spec file "${file}": could not read metadata`);
      continue;
    }

    const missing = missingTitles(e2eMetadata.titles, apiMetadata.titles);
    if (missing.length > 0) {
      failed = true;
      console.error(`spec file "${file}": missing API titles:\n${formatList(missing)}`);
    }
  }
  if (!failed) console.log(`title parity ok: ${allFiles.length} spec files`);
  return !failed;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(checkTitleParity() ? 0 : 1);
}
