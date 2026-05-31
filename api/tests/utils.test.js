import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readJsonBody } from '../_utils.js';

describe('readJsonBody', () => {
  it('reads a valid JSON body', async () => {
    const data = { hello: 'world' };
    const jsonStr = JSON.stringify(data);
    const req = [Buffer.from(jsonStr)];

    const result = await readJsonBody(req);
    assert.deepStrictEqual(result, data);
  });

  it('returns null for an empty body', async () => {
    const req = [];
    const result = await readJsonBody(req);
    assert.strictEqual(result, null);
  });

  it('throws PayloadTooLarge if maxBytes is exceeded', async () => {
    const jsonStr = JSON.stringify({ long: 'a'.repeat(10) });
    const req = [Buffer.from(jsonStr)];

    try {
      await readJsonBody(req, 10);
      assert.fail('Expected PayloadTooLarge error');
    } catch (err) {
      assert.strictEqual(err.code, 'PayloadTooLarge');
    }
  });

  it('does not throw if within maxBytes', async () => {
    const data = { short: 'hi' };
    const jsonStr = JSON.stringify(data);
    const req = [Buffer.from(jsonStr)];

    const result = await readJsonBody(req, 100);
    assert.deepStrictEqual(result, data);
  });
});
