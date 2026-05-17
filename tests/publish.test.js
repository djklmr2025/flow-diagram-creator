import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeFolder } from '../api/publish.js';

describe('sanitizeFolder', () => {
  test('returns empty string for falsy inputs', () => {
    assert.strictEqual(sanitizeFolder(null), '');
    assert.strictEqual(sanitizeFolder(undefined), '');
    assert.strictEqual(sanitizeFolder(''), '');
  });

  test('trims whitespace', () => {
    assert.strictEqual(sanitizeFolder('  folder  '), 'folder');
  });

  test('strips leading and trailing slashes', () => {
    assert.strictEqual(sanitizeFolder('/folder/'), 'folder');
    assert.strictEqual(sanitizeFolder('//folder//'), 'folder');
  });

  test('normalizes backslashes to forward slashes', () => {
    assert.strictEqual(sanitizeFolder('folder\\subfolder'), 'folder/subfolder');
    assert.strictEqual(sanitizeFolder('\\folder\\'), 'folder');
  });

  test('allows valid characters (a-zA-Z0-9/_-)', () => {
    assert.strictEqual(sanitizeFolder('metro/linea-1/estacion_x'), 'metro/linea-1/estacion_x');
    assert.strictEqual(sanitizeFolder('My-Folder_123'), 'My-Folder_123');
  });

  test('rejects invalid characters', () => {
    assert.strictEqual(sanitizeFolder('folder!@#'), '');
    assert.strictEqual(sanitizeFolder('folder with space'), '');
    assert.strictEqual(sanitizeFolder('folder?query=1'), '');
  });

  test('rejects path traversal attempts (..)', () => {
    assert.strictEqual(sanitizeFolder('..'), '');
    assert.strictEqual(sanitizeFolder('../folder'), '');
    assert.strictEqual(sanitizeFolder('folder/..'), '');
    assert.strictEqual(sanitizeFolder('folder/../subfolder'), '');
  });
});
