import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { metadataIn, missingTitles } from './check-title-parity.mjs';

void describe('directional title containment', () => {
  void it('accepts reordered titles', () => {
    assert.deepEqual(missingTitles(['one', 'two'], ['two', 'one']), []);
  });

  void it('requires duplicate multiplicity', () => {
    assert.deepEqual(missingTitles(['one', 'one'], ['one', 'one']), []);
  });

  void it('allows API-only files and titles', () => {
    assert.deepEqual(missingTitles(['one'], ['one', 'two']), []);
  });

  void it('ignores tags and describe sections because only titles are compared', () => {
    const file = path.join(os.tmpdir(), `title-parity-${process.pid}.spec.ts`);
    fs.writeFileSync(
      file,
      `test.describe('section', { tag: '@e2e' }, () => {
  test('one', () => {});
});`,
    );
    try {
      assert.deepEqual(metadataIn(file).titles, ['one']);
    } finally {
      fs.unlinkSync(file);
    }
  });

  void it('extracts decorated Playwright declarations', () => {
    const file = path.join(os.tmpdir(), `title-parity-only-${process.pid}.spec.ts`);
    fs.writeFileSync(file, `test.only('one', () => {});`);
    try {
      assert.deepEqual(metadataIn(file).titles, ['one']);
    } finally {
      fs.unlinkSync(file);
    }
  });

  void it('reports an E2E title missing from API', () => {
    assert.deepEqual(missingTitles(['one', 'two'], ['one']), ['two']);
  });

  void it('reports duplicate shortage', () => {
    assert.deepEqual(missingTitles(['one', 'one', 'two'], ['one', 'two']), ['one']);
  });
});
