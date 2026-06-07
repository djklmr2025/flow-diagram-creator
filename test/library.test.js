import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeScope } from '../api/library.js';

describe('sanitizeScope', () => {
  test('returns "library" when input is falsy', () => {
    assert.strictEqual(sanitizeScope(), 'library');
    assert.strictEqual(sanitizeScope(null), 'library');
    assert.strictEqual(sanitizeScope(undefined), 'library');
    assert.strictEqual(sanitizeScope(''), 'library');
  });

  test('returns "projects" when input is exactly "projects"', () => {
    assert.strictEqual(sanitizeScope('projects'), 'projects');
  });

  test('handles whitespace around valid input', () => {
    assert.strictEqual(sanitizeScope('  projects  '), 'projects');
    assert.strictEqual(sanitizeScope('\n projects\t'), 'projects');
  });

  test('handles case variations', () => {
    assert.strictEqual(sanitizeScope('Projects'), 'projects');
    assert.strictEqual(sanitizeScope('PROJECTS'), 'projects');
    assert.strictEqual(sanitizeScope('pRoJeCtS'), 'projects');
  });

  test('returns "library" for any invalid string', () => {
    assert.strictEqual(sanitizeScope('library'), 'library');
    assert.strictEqual(sanitizeScope('invalid'), 'library');
    assert.strictEqual(sanitizeScope('projects/subfolder'), 'library');
    assert.strictEqual(sanitizeScope('123'), 'library');
    assert.strictEqual(sanitizeScope('  '), 'library');
  });
});
