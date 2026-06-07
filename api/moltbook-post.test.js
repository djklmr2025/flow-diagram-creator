import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeTitle } from './moltbook-post.js';

test('sanitizeTitle - returns default for empty input', () => {
  assert.strictEqual(sanitizeTitle(''), 'Flow Diagram');
  assert.strictEqual(sanitizeTitle(null), 'Flow Diagram');
  assert.strictEqual(sanitizeTitle(undefined), 'Flow Diagram');
});

test('sanitizeTitle - trims whitespace', () => {
  assert.strictEqual(sanitizeTitle('  My Diagram  '), 'My Diagram');
});

test('sanitizeTitle - truncates long strings', () => {
  const longString = 'a'.repeat(150);
  const result = sanitizeTitle(longString);
  assert.strictEqual(result.length, 140);
  assert.strictEqual(result, 'a'.repeat(140));
});

test('sanitizeTitle - handles normal valid strings', () => {
  assert.strictEqual(sanitizeTitle('My Diagram'), 'My Diagram');
  assert.strictEqual(sanitizeTitle('Another Great Title!'), 'Another Great Title!');
});
