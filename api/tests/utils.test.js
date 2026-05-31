import { describe, it } from 'node:test';
import assert from 'node:assert';
import { setCors, sendJson, getOrigin } from '../_utils.js';

describe('utils', () => {
  it('setCors sets default headers', () => {
    const res = {
      headers: {},
      setHeader(k, v) { this.headers[k] = v; }
    };
    setCors(res);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.headers['access-control-allow-methods'], 'GET,POST,OPTIONS');
    assert.equal(res.headers['access-control-allow-headers'], 'content-type,x-publish-key');
  });

  it('setCors sets ai-assistant headers when flag is true', () => {
    const res = {
      headers: {},
      setHeader(k, v) { this.headers[k] = v; }
    };
    setCors(res, true);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.headers['access-control-allow-methods'], 'POST,OPTIONS');
    assert.equal(res.headers['access-control-allow-headers'], 'content-type,authorization');
  });

  it('sendJson sets status, headers, and body', () => {
    const res = {
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(data) { this.body = data; }
    };
    sendJson(res, 200, { foo: 'bar' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(res.body, '{"foo":"bar"}');
  });

  it('getOrigin returns correct origin based on headers', () => {
    const req1 = { headers: { 'x-forwarded-proto': 'http', 'x-forwarded-host': 'test.com' } };
    assert.equal(getOrigin(req1), 'http://test.com');

    const req2 = { headers: { 'host': 'localhost:3000' } };
    assert.equal(getOrigin(req2), 'https://localhost:3000');
  });
});
