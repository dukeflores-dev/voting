import test from 'node:test';
import assert from 'node:assert/strict';

import { getRecoveryParams, isRecoveryUrl, getPasswordChangeError } from './auth-flow.mjs';

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

test('profile password changes require a matching password of at least six characters', () => {
  assert.equal(getPasswordChangeError('', ''), '');
  assert.match(getPasswordChangeError('secret', ''), /confirm/i);
  assert.match(getPasswordChangeError('short', 'short'), /6 characters/i);
  assert.match(getPasswordChangeError('password1', 'password2'), /do not match/i);
  assert.equal(getPasswordChangeError('password1', 'password1'), '');
});
