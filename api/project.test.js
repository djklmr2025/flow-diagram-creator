import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getOrigin } from './project.js';

describe('getOrigin', () => {
  it('should use x-forwarded-proto and x-forwarded-host if available', () => {
    const req = {
      headers: {
        'x-forwarded-proto': 'http',
        'x-forwarded-host': 'example.com'
      }
    };
    assert.strictEqual(getOrigin(req), 'http://example.com');
  });

  it('should fallback to req.headers.host if x-forwarded-host is missing', () => {
    const req = {
      headers: {
        'x-forwarded-proto': 'https',
        'host': 'myhost.local'
      }
    };
    assert.strictEqual(getOrigin(req), 'https://myhost.local');
  });

  it('should fallback to https if x-forwarded-proto is missing', () => {
    const req = {
      headers: {
        'x-forwarded-host': 'secure.com'
      }
    };
    assert.strictEqual(getOrigin(req), 'https://secure.com');
  });

  it('should fallback to localhost if host headers are missing', () => {
    const req = {
      headers: {}
    };
    assert.strictEqual(getOrigin(req), 'https://localhost');
  });
});
