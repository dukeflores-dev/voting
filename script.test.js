const test = require('node:test');
const assert = require('node:assert/strict');

const { validateStudentId, validatePassword, getStudentIdFormatMessage } = require('./script.js');

test('student IDs accept numeric or dashed format with clear guidance', () => {
  assert.equal(validateStudentId('2024-1234'), true);
  assert.equal(validateStudentId('20241234'), true);
  assert.equal(validateStudentId('ABC-1234'), false);
  assert.match(getStudentIdFormatMessage(), /Student ID/i);
});

test('password validation enforces a strong password policy', () => {
  assert.equal(validatePassword('Abc123$5'), true);
  assert.equal(validatePassword('short'), false);
  assert.equal(validatePassword('onlylowercase123'), false);
});
