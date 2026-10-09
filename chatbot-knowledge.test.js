const test = require('node:test');
const assert = require('node:assert/strict');
const { answerVotingQuestion } = require('./chatbot-knowledge.js');

const context = {
  candidates: [
    { name: 'Maria Santos', position: 'PRESIDENT', achievements: 'Started a peer mentoring program.' },
    { name: 'Juan Dela Cruz', position: 'VICE PRESIDENT', description: 'Build a better OLLC.' }
  ],
  election: {
    title: 'Student Council Election 2026',
    startDate: '2026-05-20',
    endDate: '2026-05-23',
    deadline: '23:59',
    status: 'active'
  }
};

test('answers common voting and profile questions with system instructions', () => {
  assert.match(answerVotingQuestion('Paano ako boboto?', context), /Cast Your Vote/i);
  assert.match(answerVotingQuestion('How can I change my password?', context), /My Profile > Edit Profile/);
  assert.match(answerVotingQuestion('Where can I see my status?', context), /dashboard/i);
});

test('uses live election data and candidate details in answers', () => {
  assert.match(answerVotingQuestion('When is the deadline?', context), /May 23, 2026/);
  assert.match(answerVotingQuestion('What are Maria Santos achievements?', context), /peer mentoring program/);
  assert.match(answerVotingQuestion('Who are the candidates?', context), /Juan Dela Cruz/);
});

test('explains account setup and refuses questions outside the system', () => {
  assert.match(answerVotingQuestion('How do I register?', context), /election administrator/i);
  assert.match(answerVotingQuestion('How do I create an account?', { ...context, isAdmin: true }), /Admin Portal.*Create Student Account/);
  assert.match(answerVotingQuestion('When will results be available?', context), /Results.*after the election ends/);
  assert.match(answerVotingQuestion('Tell me about planetary geology.', context), /only answer questions about Elourdes Vote/i);
});

test('answers updated admin portal tasks using the current election context', () => {
  const adminContext = { ...context, isAdmin: true };
  assert.match(answerVotingQuestion('How do I manage candidates?', adminContext), /Manage Candidates.*Undo.*Redo/i);
  assert.match(answerVotingQuestion('How do I change the election dates?', adminContext), /Edit Settings.*Set Active Period/i);
  assert.match(answerVotingQuestion('How do I check the live tally?', adminContext), /Automated Election Tally.*voter turnout/i);
  assert.match(answerVotingQuestion('What is the election status?', adminContext), /active/i);
});

test('uses Filipino candidate queries and does not invent candidates when none are listed', () => {
  assert.match(answerVotingQuestion('Sino-sino ang mga kandidato?', context), /Maria Santos.*Juan Dela Cruz/s);
  assert.match(answerVotingQuestion('Who are the candidates?', { candidates: [], election: context.election }), /No candidates are currently listed/i);
  assert.match(answerVotingQuestion('Kailan ang deadline?', context), /May 23, 2026.*11:59 PM/i);
});

test('reports while admin election data is loading instead of using placeholder details', () => {
  assert.match(answerVotingQuestion('Who are the candidates?', { isAdmin: true, isLoading: true }), /still loading/i);
});