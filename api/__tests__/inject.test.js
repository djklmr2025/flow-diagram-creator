import test from 'node:test';
import assert from 'node:assert';
import { analyzeElements } from '../inject.js';

test('analyzeElements - empty or null inputs', () => {
  assert.deepStrictEqual(analyzeElements([]), { count: 0, hasImages: false });
  assert.deepStrictEqual(analyzeElements(null), { count: 0, hasImages: false });
  assert.deepStrictEqual(analyzeElements(undefined), { count: 0, hasImages: false });
  assert.deepStrictEqual(analyzeElements('string'), { count: 0, hasImages: false });
  assert.deepStrictEqual(analyzeElements({}), { count: 0, hasImages: false });
});

test('analyzeElements - basic objects and counting', () => {
  const elements = [
    { type: 'rectangle' },
    { type: 'circle' },
    null,
    undefined,
    'not an object',
    42
  ];

  // Non-objects should be ignored
  assert.deepStrictEqual(analyzeElements(elements), { count: 2, hasImages: false });
});

test('analyzeElements - detects images', () => {
  // Test type === 'image'
  assert.deepStrictEqual(analyzeElements([{ type: 'image' }]), { count: 1, hasImages: true });

  // Test typeof imageSrc === 'string'
  assert.deepStrictEqual(analyzeElements([{ imageSrc: 'http://example.com/img.png' }]), { count: 1, hasImages: true });

  // Test imageData != null
  assert.deepStrictEqual(analyzeElements([{ imageData: 'data:image/png;base64,...' }]), { count: 1, hasImages: true });

  // Test combined with regular elements
  assert.deepStrictEqual(
    analyzeElements([{ type: 'rectangle' }, { type: 'image' }]),
    { count: 2, hasImages: true }
  );
});

test('analyzeElements - processes nested groups', () => {
  const elements = [
    { type: 'rectangle' },
    {
      type: 'group',
      elements: [
        { type: 'circle' },
        {
          type: 'group',
          elements: [
            { type: 'image' }
          ]
        }
      ]
    }
  ];

  // count should be:
  // 1 (rectangle) + 1 (group1) + 1 (circle) + 1 (group2) + 1 (image) = 5
  assert.deepStrictEqual(analyzeElements(elements), { count: 5, hasImages: true });
});

test('analyzeElements - handles groups without elements array gracefully', () => {
  const elements = [
    { type: 'group' }, // no elements property
    { type: 'group', elements: null }, // elements is null
    { type: 'group', elements: 'not an array' } // elements is not an array
  ];

  assert.deepStrictEqual(analyzeElements(elements), { count: 3, hasImages: false });
});

test('analyzeElements - respects MAX_ELEMENTS limit', () => {
  // Assuming MAX_ELEMENTS is 2000
  const maxElements = 2000;

  // Create an array with more than max elements
  const elements = Array(maxElements + 10).fill({ type: 'rectangle' });

  // It should process up to 2001 elements because the check `count > MAX_ELEMENTS`
  // is evaluated after incrementing count.
  const result = analyzeElements(elements);
  assert.strictEqual(result.count, maxElements + 1);
  assert.strictEqual(result.hasImages, false);
});
