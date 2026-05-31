import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert';

const listMock = mock.fn();
mock.module('@vercel/blob', {
  namedExports: {
    list: listMock,
  },
});

const handler = (await import('../project.js')).default;

function createRes() {
  let responseData = '';
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(data) {
      if (data) responseData += data;
      this.finished = true;
      this.responseData = responseData;
    },
    getJson() {
      if (!this.responseData) return null;
      try {
        return JSON.parse(this.responseData);
      } catch (e) {
        return this.responseData;
      }
    }
  };
}

beforeEach(() => {
  listMock.mock.resetCalls();
  listMock.mock.mockImplementation(async () => ({ blobs: [] }));

  if (global.fetch && global.fetch.mock) {
    global.fetch.mock.restore();
  }
});

test('project handler OPTIONS request returns 204', async () => {
  const req = { method: 'OPTIONS' };
  const res = createRes();

  await handler(req, res);
  assert.strictEqual(res.statusCode, 204);
  assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  assert.strictEqual(res.headers['access-control-allow-methods'], 'GET,OPTIONS');
  assert.strictEqual(res.headers['access-control-allow-headers'], 'content-type');
});

test('project handler unsupported method returns 405', async () => {
  const req = { method: 'POST' };
  const res = createRes();

  await handler(req, res);
  assert.strictEqual(res.statusCode, 405);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'MethodNotAllowed');
});

test('project handler missing id returns 400', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project'
  };
  const res = createRes();

  await handler(req, res);
  assert.strictEqual(res.statusCode, 400);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'MissingOrInvalidId');
});

test('project handler invalid id returns 400', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=../invalid'
  };
  const res = createRes();

  await handler(req, res);
  assert.strictEqual(res.statusCode, 400);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'MissingOrInvalidId');
});

test('project handler blob list throws returns 500', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=valid-id'
  };
  const res = createRes();

  listMock.mock.mockImplementation(async () => {
    throw new Error('Blob list error');
  });

  await handler(req, res);
  assert.strictEqual(res.statusCode, 500);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'BlobListFailed');
  assert.strictEqual(json.details, 'Error: Blob list error');
});

test('project handler blob not found returns 404', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=valid-id'
  };
  const res = createRes();

  listMock.mock.mockImplementation(async () => ({ blobs: [] }));

  await handler(req, res);
  assert.strictEqual(res.statusCode, 404);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'NotFound');
  assert.strictEqual(json.id, 'valid-id');
});

test('project handler fetch fails returns 502', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=valid-id'
  };
  const res = createRes();

  listMock.mock.mockImplementation(async ({ prefix }) => {
    if (prefix === 'library/valid-id.json') {
      return { blobs: [{ pathname: 'library/valid-id.json', url: 'https://example.com/blob' }] };
    }
    return { blobs: [] };
  });

  mock.method(global, 'fetch', async () => {
    throw new Error('Fetch failed');
  });

  await handler(req, res);
  assert.strictEqual(res.statusCode, 502);
  const json = res.getJson();
  assert.strictEqual(json.ok, false);
  assert.strictEqual(json.error, 'BlobFetchFailed');
  assert.strictEqual(json.details, 'Error: Fetch failed');
});

test('project handler successful fetch returns 200 and data', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=valid-id'
  };
  const res = createRes();

  listMock.mock.mockImplementation(async ({ prefix }) => {
    if (prefix === 'library/valid-id.json') {
      return { blobs: [{ pathname: 'library/valid-id.json', url: 'https://example.com/blob' }] };
    }
    return { blobs: [] };
  });

  const mockData = { project: 'data' };
  mock.method(global, 'fetch', async () => {
    return {
      ok: true,
      text: async () => JSON.stringify(mockData)
    };
  });

  await handler(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.strictEqual(res.headers['cache-control'], 'public, max-age=60');
  const json = res.getJson();
  assert.deepStrictEqual(json, mockData);
});

test('project handler successful fetch with response.ok false returns 502', async () => {
  const req = {
    method: 'GET',
    headers: { host: 'localhost' },
    url: '/api/project?id=valid-id'
  };
  const res = createRes();

  listMock.mock.mockImplementation(async ({ prefix }) => {
    if (prefix === 'projects/valid-id.json') {
      return { blobs: [{ pathname: 'projects/valid-id.json', url: 'https://example.com/blob' }] };
    }
    return { blobs: [] };
  });

  mock.method(global, 'fetch', async () => {
    return {
      ok: false,
      text: async () => 'Not found on server'
    };
  });

  await handler(req, res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.responseData, 'Not found on server');
});
