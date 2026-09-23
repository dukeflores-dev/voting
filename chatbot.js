(function () {
  const container = document.getElementById('voting-chatbot');
  if (!container) return;

  const panel = container.querySelector('.chatbot-panel');
  const messages = container.querySelector('.chatbot-messages');
  const form = container.querySelector('.chatbot-form');
  const input = container.querySelector('.chatbot-input');
  const toggle = container.querySelector('.chatbot-toggle');
  const close = container.querySelector('.chatbot-close');
  const quickActions = container.querySelectorAll('[data-chat-question]');

  const fallbackCandidates = [
    { name: 'Maria Santos', position: 'PRESIDENT', description: 'Leadership with integrity, service with heart.' },
    { name: 'Juan Dela Cruz', position: 'VICE PRESIDENT', description: 'Together, we can build a better OLLC.' },
    { name: 'Ana Reyes', position: 'SECRETARY', description: 'Organized today, empowered tomorrow.' }
  ];

  function getCandidates() {
    return Array.isArray(window.elourdesCandidates) && window.elourdesCandidates.length
      ? window.elourdesCandidates
      : fallbackCandidates;
  }

  function getElection() {
    return window.elourdesElection || { title: 'Student Council Election 2026', startDate: '2026-05-20', endDate: '2026-05-23', deadline: '23:59' };
  }

  function addMessage(text, type) {
    const message = document.createElement('p');
    message.className = `chatbot-message ${type}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function candidateAnswer(question) {
    const candidates = getCandidates();
    const candidate = candidates.find(item => question.includes(String(item.name || '').toLowerCase()));
    if (!candidate) return null;

    const details = [candidate.position, candidate.group_name || candidate.group || candidate.party].filter(Boolean).join(' | ');
    const profile = candidate.profile || candidate.achievements || candidate.description || candidate.platform || 'No profile details have been added yet.';
    return `${candidate.name}${details ? ` (${details})` : ''}.
${profile}`;
  }

  function answerQuestion(rawQuestion) {
    const question = rawQuestion.trim().toLowerCase();
    if (!question) return 'Type a question about the voting system or candidates.';

    const candidateReply = candidateAnswer(question);
    if (candidateReply) return candidateReply;

    if (/candidate|candidates|profile|achievement|platform|position|sino/.test(question)) {
      const names = getCandidates().map(candidate => `${candidate.name} (${candidate.position || 'Position not set'})`).join(', ');
      return names ? `Registered candidates: ${names}. Type a candidate name to view their profile or achievements.` : 'No candidate information is available yet.';
    }
    if (/create.*account|make.*account|sign[ -]?up|register|registration|new account|paano.*(account|mag.*sign)|mag.*(register|sign up)|gumawa.*account/.test(question)) {
      return 'To create an account, click Sign up on the login page, complete your full name, student ID, year and level, gender, email, and password, then confirm the Terms and Conditions. Click Create Account. If email confirmation is required, open the confirmation email before logging in.';
    }
    if (/how.*vote|paano.*vote|cast|bumoto|ballot|voting process/.test(question)) return 'Go to Election, choose one candidate for each position, review your ballot, and submit it. Your vote is final after submission.';
    if (/when|kailan|period|deadline|schedule|date/.test(question)) {
      const election = getElection();
      return `${election.title} runs from ${formatDate(election.startDate)} to ${formatDate(election.endDate)}, with a deadline of ${election.deadline}.`;
    }
    if (/rule|rules|guideline|guidelines|bawal|one vote|ilang beses/.test(question)) return 'Use your own account, vote only once per position, review your selections, and remember that submitted votes cannot be changed.';
    if (/result|results|status|nakaboto/.test(question)) return 'Election results will be available after the election ends and you have submitted your vote.';
    if (/help|support|problem|issue|problema/.test(question)) return 'For account or technical issues, contact the election administrator through Help & Support.';

    return 'I can answer questions about the voting process, election schedule, guidelines, and candidate profiles or achievements. What would you like to know?';
  }

  function showTyping() {
    const typing = document.createElement('p');
    typing.className = 'chatbot-message bot typing';
    typing.setAttribute('aria-label', 'AI is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    return typing;
  }

  function submitQuestion(question) {
    addMessage(question, 'user');
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      addMessage(answerQuestion(question), 'bot');
    }, 520);
  }

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) input.focus();
  });
  close.addEventListener('click', () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    submitQuestion(question);
  });
  quickActions.forEach(button => button.addEventListener('click', () => submitQuestion(button.dataset.chatQuestion)));

  addMessage('Hi! I can help with the voting system and candidate profiles. What is your question?', 'bot');
}());