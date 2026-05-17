import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Extract the formatBytes function dynamically from app.js to test it in isolation
const appJsPath = path.resolve(process.cwd(), 'previewer-2.0/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const regex = /function formatBytes\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
const match = appJsContent.match(regex);

if (!match) {
  throw new Error('formatBytes function not found in app.js');
}

const formatBytesStr = match[0];
const formatBytes = new Function(`return ${formatBytesStr}`)();

test('formatBytes utility tests', async (t) => {
  await t.test('handles 0 and negative values', () => {
    assert.strictEqual(formatBytes(0), '0 B');
    assert.strictEqual(formatBytes(-100), '0 B');
  });

  await t.test('handles non-numeric and invalid inputs', () => {
    assert.strictEqual(formatBytes(null), '0 B');
    assert.strictEqual(formatBytes(undefined), '0 B');
    assert.strictEqual(formatBytes('abc'), '0 B');
    assert.strictEqual(formatBytes(NaN), '0 B');
    assert.strictEqual(formatBytes(Infinity), '0 B');
    assert.strictEqual(formatBytes(-Infinity), '0 B');
  });

  await t.test('formats Bytes (< 1024)', () => {
    assert.strictEqual(formatBytes(500), '500 B');
    assert.strictEqual(formatBytes(1023), '1023 B');
  });

  await t.test('formats Kilobytes (< 1024 * 1024)', () => {
    assert.strictEqual(formatBytes(1024), '1.0 KB');
    assert.strictEqual(formatBytes(1500), '1.5 KB');
    assert.strictEqual(formatBytes(1024 * 1024 - 1), '1024.0 KB');
  });

  await t.test('formats Megabytes (>= 1024 * 1024)', () => {
    assert.strictEqual(formatBytes(1024 * 1024), '1.0 MB');
    assert.strictEqual(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
    assert.strictEqual(formatBytes(1024 * 1024 * 1024), '1024.0 MB');
  });
});
