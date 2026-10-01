const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateStudentId,
  normalizeStudentId,
  getLoginIdentity,
  matchesLoginStudentId,
  getRegistrationPassword,
  getStudentIdFormatMessage
} = require('./script.js');

test('student IDs accept numeric or dashed format with clear guidance', () => {
  assert.equal(validateStudentId('2024-1234'), true);
  assert.equal(validateStudentId('20241234'), true);
  assert.equal(validateStudentId('ABC-1234'), false);
  assert.equal(normalizeStudentId('2024-4447'), '20244447');
  assert.match(getStudentIdFormatMessage(), /Student ID/i);
});

test('login routes student IDs to the private auth lookup and permits admin email login', () => {
  assert.deepEqual(getLoginIdentity('2024-1234'), { type: 'student_id', value: '2024-1234' });
  assert.equal(getLoginIdentity('not-a-student-id'), null);
  assert.deepEqual(getLoginIdentity('admin@example.com'), { type: 'email', value: 'admin@example.com' });
});

test('voter authentication requires the registered Student ID, not email', () => {
  const user = { user_metadata: { student_id: '2024-1234' } };
  assert.equal(matchesLoginStudentId(user, '2024-1234'), true);
  assert.equal(matchesLoginStudentId(user, '2024-9999'), false);
  assert.equal(matchesLoginStudentId(user, 'student@example.com'), false);
});

test('registration uses the exact Student ID as its password', () => {
  assert.equal(getRegistrationPassword(' 2024-1234 '), '2024-1234');
});
