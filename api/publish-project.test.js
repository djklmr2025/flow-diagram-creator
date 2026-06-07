import test from 'node:test';
import assert from 'node:assert';
import { countElementsRecursive } from './publish-project.js';

test('countElementsRecursive', async (t) => {
  await t.test('returns 0 for null, undefined, or non-object inputs', () => {
    assert.strictEqual(countElementsRecursive(null), 0);
    assert.strictEqual(countElementsRecursive(undefined), 0);
    assert.strictEqual(countElementsRecursive(123), 0);
    assert.strictEqual(countElementsRecursive('string'), 0);
  });

  await t.test('returns 0 for empty array', () => {
    assert.strictEqual(countElementsRecursive([]), 0);
  });

  await t.test('counts basic elements correctly', () => {
    const elements = [
      { type: 'rectangle' },
      { type: 'circle' },
      { type: 'text' }
    ];
    assert.strictEqual(countElementsRecursive(elements), 3);
  });

  await t.test('counts nested groups correctly', () => {
    const elements = [
      { type: 'rectangle' },
      {
        type: 'group',
        elements: [
          { type: 'circle' },
          { type: 'text' }
        ]
      }
    ];
    // 1 (rectangle) + 1 (group) + 2 (nested elements) = 4
    assert.strictEqual(countElementsRecursive(elements), 4);
  });

  await t.test('counts deeply nested groups correctly', () => {
    const elements = [
      {
        type: 'group',
        elements: [
          { type: 'rectangle' },
          {
            type: 'group',
            elements: [
              { type: 'circle' },
              {
                type: 'group',
                elements: [
                  { type: 'text' }
                ]
              }
            ]
          }
        ]
      }
    ];
    // 1 (top group) + 1 (rect) + 1 (mid group) + 1 (circle) + 1 (inner group) + 1 (text) = 6
    assert.strictEqual(countElementsRecursive(elements), 6);
  });

  await t.test('ignores invalid elements mixed with valid elements', () => {
    const elements = [
      { type: 'rectangle' },
      null,
      undefined,
      123,
      {
        type: 'group',
        elements: [
          'invalid',
          { type: 'circle' },
          null
        ]
      }
    ];
    // 1 (rectangle) + 1 (group) + 1 (circle) = 3
    assert.strictEqual(countElementsRecursive(elements), 3);
  });
});
