import assert from 'node:assert';
import { test } from 'node:test';
import { readJsonBody } from './moltbook-post.js';

const createMockReq = (chunks) => {
  async function* generate() {
    for (const chunk of chunks) {
      yield Buffer.from(chunk);
    }
  }
  return generate();
};

test('readJsonBody parses valid JSON successfully', async () => {
  const req = createMockReq(['{"hello":', '"world"}']);
  const result = await readJsonBody(req, 100);
  assert.deepStrictEqual(result, { hello: 'world' });
});

test('readJsonBody returns null for empty body', async () => {
  const req = createMockReq(['']);
  const result = await readJsonBody(req, 100);
  assert.strictEqual(result, null);
});

test('readJsonBody throws PayloadTooLarge when body exceeds maxBytes', async () => {
  const req = createMockReq(['{"a":1}', '{"b":2}']); // Total length > 5
  await assert.rejects(
    readJsonBody(req, 5),
    (err) => {
      assert.strictEqual(err.code, 'PayloadTooLarge');
      // The function stops adding chunks when it throws.
      // First chunk '{"a":1}' is 7 bytes. 7 > 5, so it throws immediately.
      assert.strictEqual(err.bytes, 7);
      return true;
    }
  );
});

test('readJsonBody throws SyntaxError for invalid JSON', async () => {
  const req = createMockReq(['{invalid json}']);
  await assert.rejects(
    readJsonBody(req, 100),
    SyntaxError
  );
});
