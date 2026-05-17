import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the file content
const fileContent = readFileSync(join(process.cwd(), 'api', 'publish.js'), 'utf8');

// Strip out imports and the export statement to evaluate the functions
let moduleCode = fileContent.replace(/import .* from '.*';\n/g, '');
moduleCode = moduleCode.replace('export default async function handler', 'async function handler');

const testCode = `
  ${moduleCode}

  return { validateProject, analyzeElements, MAX_ELEMENTS };
`;

// Extract the functions
const extract = new Function(testCode);
const { validateProject, MAX_ELEMENTS } = extract();

describe('validateProject from api/publish.js', () => {
  it('should return errors if project is not an object or is null', () => {
    assert.deepStrictEqual(validateProject(null), ['body debe ser un objeto JSON']);
    assert.deepStrictEqual(validateProject(undefined), ['body debe ser un objeto JSON']);
    assert.deepStrictEqual(validateProject('string'), ['body debe ser un objeto JSON']);
    assert.deepStrictEqual(validateProject(123), ['body debe ser un objeto JSON']);
  });

  it('should return errors if elements is not an array', () => {
    assert.deepStrictEqual(validateProject({}), ['elements debe ser un array']);
    assert.deepStrictEqual(validateProject({ elements: 'not an array' }), ['elements debe ser un array']);
    assert.deepStrictEqual(validateProject({ elements: null }), ['elements debe ser un array']);
  });

  it('should pass for a valid project', () => {
    assert.deepStrictEqual(validateProject({ elements: [] }), []);
    assert.deepStrictEqual(validateProject({ elements: [{ type: 'rectangle' }] }), []);
  });

  it('should reject projects with more than MAX_ELEMENTS', () => {
    const manyElements = Array.from({ length: MAX_ELEMENTS + 1 }, () => ({ type: 'rectangle' }));
    assert.deepStrictEqual(validateProject({ elements: manyElements }), [
      `elements excede el máximo (${MAX_ELEMENTS}): ${MAX_ELEMENTS + 1}`
    ]);
  });

  it('should reject projects with images in flat array', () => {
    assert.deepStrictEqual(validateProject({ elements: [{ type: 'image' }] }), [
      'Imágenes no permitidas: elimina elementos tipo "image" / imageSrc'
    ]);
    assert.deepStrictEqual(validateProject({ elements: [{ imageSrc: 'some_url' }] }), [
      'Imágenes no permitidas: elimina elementos tipo "image" / imageSrc'
    ]);
    assert.deepStrictEqual(validateProject({ elements: [{ imageData: 'base64...' }] }), [
      'Imágenes no permitidas: elimina elementos tipo "image" / imageSrc'
    ]);
  });

  it('should reject projects with images in nested groups', () => {
    const project = {
      elements: [
        {
          type: 'group',
          elements: [
            { type: 'rectangle' },
            { type: 'group', elements: [{ type: 'image' }] }
          ]
        }
      ]
    };

    const errors = validateProject(project);
    assert.ok(errors.includes('Imágenes no permitidas: elimina elementos tipo "image" / imageSrc'));
  });

  it('should reject invalid camera object', () => {
    assert.deepStrictEqual(validateProject({ elements: [], camera: 'not an object' }), [
      'camera debe ser un objeto'
    ]);
    assert.deepStrictEqual(validateProject({ elements: [], camera: 123 }), [
      'camera debe ser un objeto'
    ]);
  });

  it('should accept valid camera object or no camera', () => {
    assert.deepStrictEqual(validateProject({ elements: [], camera: { x: 0, y: 0, zoom: 1 } }), []);
    assert.deepStrictEqual(validateProject({ elements: [] }), []);
  });
});
