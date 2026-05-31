import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeElementInPlace, normalizeProjectInPlace, walkElements } from '../_shared/normalize.js';

describe('normalize', () => {
  describe('normalizeElementInPlace', () => {
    it('deletes imageData', () => {
      const elem = { imageData: 'base64...' };
      normalizeElementInPlace(elem);
      assert.strictEqual(elem.imageData, undefined);
    });

    it('sets default active from isAnim', () => {
      const elem = { isAnim: true };
      normalizeElementInPlace(elem);
      assert.strictEqual(elem.active, true);
    });
  });
  describe('normalizeProjectInPlace', () => {
    it('initializes camera if missing', () => {
      const project = { elements: [] };
      normalizeProjectInPlace(project);
      assert.deepStrictEqual(project.camera, { x: 0, y: 0, zoom: 1 });
    });
  });
});
