import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeElementInPlace } from '../publish.js';

describe('normalizeElementInPlace', () => {
    test('returns early for non-objects', () => {
        const nullElem = null;
        normalizeElementInPlace(nullElem);
        assert.equal(nullElem, null);

        let undefinedElem;
        normalizeElementInPlace(undefinedElem);
        assert.equal(undefinedElem, undefined);

        let stringElem = "string";
        normalizeElementInPlace(stringElem);
        assert.equal(stringElem, "string");
    });

    test('color to fillColor/strokeColor conversion for shape types', () => {
        const shapes = ['rectangle', 'circle', 'polygon'];

        shapes.forEach(type => {
            const elem = { type, color: '#123456' };
            normalizeElementInPlace(elem);
            assert.equal(elem.fillColor, '#123456');
            assert.equal(elem.strokeColor, '#123456');
        });

        // Test that it does not overwrite existing fillColor/strokeColor if they are strings
        shapes.forEach(type => {
            const elem = { type, color: '#123456', fillColor: '#abcdef', strokeColor: '#fedcba' };
            normalizeElementInPlace(elem);
            assert.equal(elem.fillColor, '#abcdef');
            assert.equal(elem.strokeColor, '#fedcba');
        });

        // Test it handles non-shapes appropriately (doesn't set fillColor from color, but does set strokeColor)
        const nonShapeElem = { type: 'line', color: '#123456' };
        normalizeElementInPlace(nonShapeElem);
        assert.equal(nonShapeElem.strokeColor, '#123456');
        assert.notEqual(nonShapeElem.fillColor, '#123456');
    });

    test('isAnim to active conversion', () => {
        const elemTrue = { isAnim: true };
        normalizeElementInPlace(elemTrue);
        assert.equal(elemTrue.active, true);

        const elemFalse = { isAnim: false };
        normalizeElementInPlace(elemFalse);
        assert.equal(elemFalse.active, false);

        const elemExisting = { isAnim: true, active: false };
        normalizeElementInPlace(elemExisting);
        assert.equal(elemExisting.active, false); // Shouldn't overwrite existing boolean active
    });

    test('circle radius to width/height conversion', () => {
        const elem = { type: 'circle', radius: 10, x: 50, y: 50 };
        normalizeElementInPlace(elem);
        assert.equal(elem.radius, undefined);
        assert.equal(elem.x, 40); // 50 - 10
        assert.equal(elem.y, 40); // 50 - 10
        assert.equal(elem.width, 20); // 10 * 2
        assert.equal(elem.height, 20); // 10 * 2

        // Missing x/y handling
        const elemNoXY = { type: 'circle', radius: 10 };
        normalizeElementInPlace(elemNoXY);
        assert.equal(elemNoXY.radius, undefined);
        assert.equal(elemNoXY.x, -10); // 0 - 10
        assert.equal(elemNoXY.y, -10); // 0 - 10
        assert.equal(elemNoXY.width, 20); // 10 * 2
        assert.equal(elemNoXY.height, 20); // 10 * 2

        // Existing width/height handling (should not convert if width or height are finite numbers)
        const elemWithDimensions = { type: 'circle', radius: 10, width: 30, height: 30, x: 50, y: 50 };
        normalizeElementInPlace(elemWithDimensions);
        assert.equal(elemWithDimensions.radius, 10);
        assert.equal(elemWithDimensions.width, 30);
        assert.equal(elemWithDimensions.x, 50); // shouldn't change
    });

    test('line x1/y1/x2/y2 to x/y/endX/endY conversion', () => {
        const elem = { type: 'line', x1: 10, y1: 20, x2: 30, y2: 40 };
        normalizeElementInPlace(elem);
        assert.equal(elem.x1, undefined);
        assert.equal(elem.y1, undefined);
        assert.equal(elem.x2, undefined);
        assert.equal(elem.y2, undefined);
        assert.equal(elem.x, 10);
        assert.equal(elem.y, 20);
        assert.equal(elem.endX, 30);
        assert.equal(elem.endY, 40);

        // Test existing values aren't overwritten
        const elemWithExisting = { type: 'line', x1: 10, y1: 20, x2: 30, y2: 40, x: 100, y: 200, endX: 300, endY: 400 };
        normalizeElementInPlace(elemWithExisting);
        assert.equal(elemWithExisting.x1, 10); // Shouldn't delete since condition wasn't met
        assert.equal(elemWithExisting.x, 100);
    });

    test('default values initialization for line elements', () => {
        const elem = { type: 'line' };
        normalizeElementInPlace(elem);
        assert.equal(elem.x, 0);
        assert.equal(elem.y, 0);
        assert.equal(elem.endX, 0);
        assert.equal(elem.endY, 0);
        assert.equal(elem.strokeColor, '#e94560');
        assert.equal(elem.animColor, '#4caf50');
        assert.equal(elem.flowDirection, 'right');
        assert.equal(elem.animOffset, 0);
        assert.deepEqual(elem.controlPoints, []);
    });

    test('default values initialization for rectangle and circle elements', () => {
        const shapes = ['rectangle', 'circle'];
        shapes.forEach(type => {
            const elem = { type };
            normalizeElementInPlace(elem);
            assert.equal(elem.x, 0);
            assert.equal(elem.y, 0);
            assert.equal(elem.width, 0);
            assert.equal(elem.height, 0);
            assert.equal(elem.fillColor, '#0f3460');
            assert.equal(elem.strokeColor, '#e94560');
        });
    });

    test('default values initialization for polygon and path elements', () => {
        const shapes = ['polygon', 'path'];
        shapes.forEach(type => {
            const elem = { type };
            normalizeElementInPlace(elem);
            assert.equal(elem.fillColor, '#0f3460');
            assert.equal(elem.strokeColor, '#e94560');
            assert.equal(elem.lineWidth, 3);
        });
    });

    test('global properties initialization', () => {
        const elem = { type: 'unknown' };
        normalizeElementInPlace(elem);
        assert.equal(elem.name, '');
        assert.equal(elem.locked, false);
        assert.equal(elem.active, true);
        assert.equal(elem.connectionStatus, 'none');

        // Test existing values aren't overwritten
        const elemExisting = {
            type: 'unknown',
            name: 'custom',
            locked: true,
            active: false,
            connectionStatus: 'connected'
        };
        normalizeElementInPlace(elemExisting);
        assert.equal(elemExisting.name, 'custom');
        assert.equal(elemExisting.locked, true);
        assert.equal(elemExisting.active, false);
        assert.equal(elemExisting.connectionStatus, 'connected');
    });
});
