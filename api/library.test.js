import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizePrefix } from './library.js';

describe('sanitizePrefix', () => {
  it('returns empty string for null, undefined, and empty string', () => {
    assert.strictEqual(sanitizePrefix(null), '');
    assert.strictEqual(sanitizePrefix(undefined), '');
    assert.strictEqual(sanitizePrefix(''), '');
  });

  it('trims leading and trailing spaces', () => {
    assert.strictEqual(sanitizePrefix('  test  '), 'test');
    assert.strictEqual(sanitizePrefix('test/dir '), 'test/dir');
  });

  it('strips leading slashes', () => {
    assert.strictEqual(sanitizePrefix('/test'), 'test');
    assert.strictEqual(sanitizePrefix('//test'), 'test');
    assert.strictEqual(sanitizePrefix('///test/dir'), 'test/dir');
  });

  it('converts backslashes to forward slashes', () => {
    assert.strictEqual(sanitizePrefix('test\\dir'), 'test/dir');
    assert.strictEqual(sanitizePrefix('test\\\\dir'), 'test/dir');
  });

  it('allows valid characters (letters, numbers, /, _, -)', () => {
    assert.strictEqual(sanitizePrefix('valid-prefix_123/aB'), 'valid-prefix_123/aB');
  });

  it('returns empty string if it contains invalid characters', () => {
    assert.strictEqual(sanitizePrefix('invalid!prefix'), '');
    assert.strictEqual(sanitizePrefix('test?dir'), '');
    assert.strictEqual(sanitizePrefix('test*dir'), '');
    assert.strictEqual(sanitizePrefix('test<dir'), '');
    assert.strictEqual(sanitizePrefix('test%dir'), '');
  });

  it('returns empty string for directory traversal attempts', () => {
    assert.strictEqual(sanitizePrefix('..'), '');
    assert.strictEqual(sanitizePrefix('../test'), '');
    assert.strictEqual(sanitizePrefix('test/../dir'), '');
    assert.strictEqual(sanitizePrefix('..\\test'), '');
  });

  it('handles combination of operations', () => {
    // Tests that reveal how the function processes operations
    assert.strictEqual(sanitizePrefix('  /\\test\\dir  '), '/test/dir');
    assert.strictEqual(sanitizePrefix(' ///  test  // '), ''); // Invalid chars (space inside) after trim and slashes replacement
  });
});
