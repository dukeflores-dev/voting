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

  function getCandidates() {
    return Array.isArray(window.elourdesCandidates) ? window.elourdesCandidates : [];
  }

  function getElection() {
    return window.elourdesElection || {};
  }

  function addMessage(text, type) {
    const message = document.createElement('p');
    message.className = `chatbot-message ${type}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function answerQuestion(rawQuestion) {
    return window.answerVotingQuestion(rawQuestion, {
      candidates: getCandidates(),
      election: getElection(),
      isAdmin: Boolean(document.querySelector('.admin-main')),
      isLoading: window.elourdesChatbotReady === false
    });
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

  const isAdmin = Boolean(document.querySelector('.admin-main'));
  container.querySelectorAll('[data-chat-admin-only]').forEach(button => { button.hidden = !isAdmin; });
  addMessage(isAdmin
    ? 'Hi! I can help with candidate management, student accounts, election settings, voting schedules, and the live tally. Ano ang kailangan mo?'
    : 'Hi! I can help with login, voting, election dates and results, profiles, account access, and candidate information. Ano ang gusto mong malaman?', 'bot');
}());