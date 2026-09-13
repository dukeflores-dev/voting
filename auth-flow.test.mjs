import test from 'node:test';
import assert from 'node:assert/strict';

import { getRecoveryParams, isRecoveryUrl } from './auth-flow.mjs';

test('detects a Supabase password recovery URL', () => {
  const url = 'https://example.com/index.html?code=abc&type=recovery';
  assert.equal(isRecoveryUrl(url), true);
  assert.deepEqual(getRecoveryParams(url), {
    code: 'abc',
    type: 'recovery',
    accessToken: null,
    refreshToken: null
  });
});

test('detects hash-based recovery tokens', () => {
  const url = 'https://example.com/index.html#access_token=token123&refresh_token=refresh456&type=recovery';
  assert.equal(isRecoveryUrl(url), true);
  assert.deepEqual(getRecoveryParams(url), {
    code: null,
    type: 'recovery',
    accessToken: 'token123',
    refreshToken: 'refresh456'
  });
});
