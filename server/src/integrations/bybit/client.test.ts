import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { BybitApiError, BybitClient } from './client.js';

const credentials = { apiKey: 'public-key', apiSecret: 'private-secret' };
const fixedNow = 1_700_000_000_000;

function jsonResponse(
  result: unknown,
  options: { retCode?: number; retMsg?: string; status?: number; headers?: HeadersInit } = {}
) {
  return new Response(
    JSON.stringify({
      retCode: options.retCode ?? 0,
      retMsg: options.retMsg ?? 'OK',
      result,
    }),
    { status: options.status ?? 200, headers: options.headers }
  );
}

test('signs the exact query sent to Bybit', async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    assert.equal(url, 'https://api.bybit.test/v5/example?category=linear&limit=1');
    const expectedSignature = createHmac('sha256', credentials.apiSecret)
      .update(`${fixedNow}${credentials.apiKey}5000category=linear&limit=1`)
      .digest('hex');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('X-BAPI-TIMESTAMP'), String(fixedNow));
    assert.equal(headers.get('X-BAPI-SIGN'), expectedSignature);
    return jsonResponse({ value: 42 });
  };
  const client = new BybitClient(credentials, {
    baseUrl: 'https://api.bybit.test',
    fetchImpl,
    now: () => fixedNow,
  });

  const result = await client.signedGet<{ value: number }>(
    '/v5/example',
    new URLSearchParams({ category: 'linear', limit: '1' })
  );

  assert.deepEqual(result, { value: 42 });
});

test('follows cursor pagination without dropping pages', async () => {
  const cursors: Array<string | null> = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const cursor = url.searchParams.get('cursor');
    cursors.push(cursor);
    assert.equal(url.searchParams.get('limit'), '100');
    return cursor
      ? jsonResponse({ list: [{ execId: 'exec-2' }], nextPageCursor: '' })
      : jsonResponse({ list: [{ execId: 'exec-1' }], nextPageCursor: 'next-page' });
  };
  const client = new BybitClient(credentials, {
    fetchImpl,
    now: () => fixedNow,
  });

  const records = [];
  for await (const page of client.executionPages('linear', fixedNow - 1_000, fixedNow)) {
    records.push(...(page.list ?? []));
  }

  assert.deepEqual(cursors, [null, 'next-page']);
  assert.deepEqual(
    records.map((record) => record.execId),
    ['exec-1', 'exec-2']
  );
});

test('retries a temporary Bybit rate-limit response using reset header', async () => {
  let requests = 0;
  const sleeps: number[] = [];
  const fetchImpl: typeof fetch = async () => {
    requests += 1;
    return requests === 1
      ? jsonResponse(
          {},
          {
            retCode: 10006,
            retMsg: 'Too many visits!',
            headers: { 'X-Bapi-Limit-Reset-Timestamp': String(fixedNow + 25) },
          }
        )
      : jsonResponse({ list: [] });
  };
  const client = new BybitClient(credentials, {
    fetchImpl,
    now: () => fixedNow,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
  });

  await client.getWalletBalance();

  assert.equal(requests, 2);
  assert.deepEqual(sleeps, [25]);
});

test('does not retry a non-retryable authentication error', async () => {
  let requests = 0;
  const client = new BybitClient(credentials, {
    fetchImpl: async () => {
      requests += 1;
      return jsonResponse({}, { retCode: 10003, retMsg: 'API key is invalid' });
    },
    now: () => fixedNow,
  });

  await assert.rejects(
    () => client.getApiKeyInfo(),
    (error: unknown) =>
      error instanceof BybitApiError && error.code === 'BYBIT_10003' && error.retryable === false
  );
  assert.equal(requests, 1);
});

test('stops a repeated cursor instead of looping forever', async () => {
  const client = new BybitClient(credentials, {
    fetchImpl: async () =>
      jsonResponse({ list: [{ execId: 'exec-1' }], nextPageCursor: 'same-cursor' }),
    now: () => fixedNow,
  });

  await assert.rejects(
    async () => {
      for await (const _page of client.executionPages('linear', fixedNow - 1_000, fixedNow)) {
        // Consume pages until the client detects the upstream cursor loop.
      }
    },
    (error: unknown) => error instanceof BybitApiError && error.code === 'BYBIT_CURSOR_LOOP'
  );
});
