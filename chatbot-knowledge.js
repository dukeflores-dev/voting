function normalizeChatQuestion(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function formatElectionDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function answerVotingQuestion(rawQuestion, context = {}) {
  const question = normalizeChatQuestion(rawQuestion);
  const candidates = Array.isArray(context.candidates) ? context.candidates : [];
  const election = context.election || {};
  if (context.isLoading) return "The election data is still loading. Please try again in a moment.";
  if (!question) return "Ask me about voting, candidates, election dates, your profile, or account access. Maaari rin akong tumulong sa admin tasks.";

  const isElourdesVoteTopic = /candidate|candidates|kandidato|kandidata|vote|voting|ballot|boto|bumoto|boboto|result|results|tally|turnout|winner|election|halalan|deadline|schedule|date|password|profile|login|status|account|admin|help|support|system|website|app|guideline|rules|period|achievement|background|credential|platform|student|eligibility|register|signup|signin/.test(question);
  if (!isElourdesVoteTopic) {
    return "I can only answer questions about Elourdes Vote, including voting, candidates, election dates, profiles, account access, and results.";
  }

  const namedCandidate = candidates.find(candidate => {
    const name = normalizeChatQuestion(candidate.name);
    return name && question.includes(name);
  });
  if (namedCandidate) {
    if (/achievement|award|accomplish/.test(question)) {
      return namedCandidate.achievements || `${namedCandidate.name} has no achievements listed in the candidate information.`;
    }
    if (/background|experience|education/.test(question)) {
      return namedCandidate.background || `${namedCandidate.name} has no background information listed.`;
    }
    if (/credential|qualification/.test(question)) {
      return namedCandidate.credentials || `${namedCandidate.name} has no credentials listed.`;
    }
    if (/platform|relevant information/.test(question)) {
      return namedCandidate.relevant_information || namedCandidate.platform || namedCandidate.description || `${namedCandidate.name} has no platform information listed.`;
    }
    const details = [
      namedCandidate.position,
      namedCandidate.group_name || namedCandidate.group || namedCandidate.party,
      namedCandidate.description || namedCandidate.platform,
      namedCandidate.background,
      namedCandidate.credentials,
      namedCandidate.achievements,
      namedCandidate.relevant_information
    ].filter(Boolean);
    return `${namedCandidate.name}: ${details.join(". ") || "No profile information is available."}`;
  }

  if (context.isAdmin && /candidate|kandidato/.test(question) && /add|edit|update|delete|remove|manage|undo|redo|baguhin|dagdag|alisin|tanggal/.test(question)) {
    return "In the Admin Portal, use Manage Candidates to add, edit, or delete candidate profiles. Use Undo or Redo to reverse the latest candidate-list change. Candidate details include position, group, description, background, credentials, achievements, and relevant information.";
  }
  if (context.isAdmin && /election|halalan|voting period|schedule|date|deadline|setting|settings|eligible voter|active period/.test(question) && /edit|change|update|set|activate|start|close|baguhin|palitan|simulan/.test(question)) {
    return "In the Admin Portal, use Edit Settings to update the election title, voting dates, deadline, and eligible-voter count. Use Set Active Period to open voting. Check the current election status and dates before activating it.";
  }
  if (context.isAdmin && /tally|turnout|vote count|live result|admin result|monitor.*vote|bilang.*boto/.test(question)) {
    return "The Admin Portal's Automated Election Tally shows live vote totals and voter turnout, and refreshes automatically. Student-facing final results are available from Results after the election ends.";
  }

  if (/candidate|candidates|kandidato|kandidata|who is running|sino.*(running|candidate|kandidato|kandidata)|mga kandidato|platform/.test(question)) {
    const position = candidates.find(candidate => candidate.position && question.includes(normalizeChatQuestion(candidate.position)))?.position;
    const matchingCandidates = position
      ? candidates.filter(candidate => normalizeChatQuestion(candidate.position) === normalizeChatQuestion(position))
      : candidates;
    if (!matchingCandidates.length) return candidates.length
      ? "There is no candidate information available for that election position."
      : "No candidates are currently listed for this election. Please check with the election administrator.";
    return matchingCandidates.map(candidate => {
      const group = candidate.group_name || candidate.group || candidate.party;
      const description = candidate.description || candidate.platform;
      return `${candidate.name} (${candidate.position || "Position not set"})${group ? `, ${group}` : ""}${description ? `: ${description}` : ""}`;
    }).join("\n");
  }

  if (/password|passcode|palitan.*(password|s password)|change.*password|reset.*password/.test(question)) {
    return "To change your password, open My Profile > Edit Profile. Enter the same value in New Password and Confirm Password, then save. Passwords must be at least 6 characters. If you cannot sign in, contact the election administrator.";
  }
  if (/profile|edit.*(name|gender|year|picture)|palitan.*(profile|picture|year|gender)|my profile/.test(question)) {
    return "Open My Profile from the account menu. Choose Edit Profile to update your year level, gender, profile picture, or password, then save your changes.";
  }
  if (/create.*account|make.*account|sign[ -]?up|register|registration|new account|paano.*(account|mag.*sign)|mag.*(register|sign up)|gumawa.*account/.test(question)) {
    if (context.isAdmin) return "In the Admin Portal, use Create Student Account and enter the student's name, Student ID, email, gender, and year level. The initial password is the Student ID.";
    return "Student accounts are set up by an election administrator. Contact the administrator with your name, Student ID, email, gender, and year level. Your initial password is your Student ID.";
  }
  if (/log ?in|sign ?in|login|password.*(wrong|incorrect)|hindi.*makapasok|makapag.*login|paano.*(mag.*login|makapasok)/.test(question)) {
    return "Log in with your registered Student ID and password. Your initial password is your Student ID unless you have changed it. If your credentials do not work, contact the election administrator.";
  }
  if (/how.*vote|paano.*(bumoto|boboto|mag.*vote)|cast.*vote|ballot|voting process|submit.*vote/.test(question)) {
    return "From the dashboard, choose Cast Your Vote, select one candidate for each position, review your ballot, and submit it. A submitted vote is final and cannot be changed.";
  }
  if (/who can vote|eligible|eligibility|sino.*(puwedeng|maaaring).*bumoto/.test(question)) {
    return "The system is for registered, eligible Our Lady of Lourdes College Junior High School and Senior High School students. Contact the election administrator if you are unsure whether you are eligible.";
  }
  if (/result|results|tally|winner|nanalo/.test(question)) {
    if (context.isAdmin && /tally|turnout|vote count|live/.test(question)) {
      return "The Admin Portal's Automated Election Tally shows live vote totals and voter turnout, and refreshes automatically. Student-facing final results are available after the election ends.";
    }
    return "Open Results from the dashboard to view the election results when they are available. Results are shown after the election ends.";
  }
  if (/when|kailan|period|deadline|schedule|date|anong oras/.test(question)) {
    const title = election.title || "Student Council Election";
    const startDate = formatElectionDate(election.startDate || election.start_date);
    const endDate = formatElectionDate(election.endDate || election.end_date);
    const deadline = election.deadline ? formatElectionTime(election.deadline) : "Not set";
    const status = election.status ? ` Current status: ${String(election.status).toLowerCase()}.` : "";
    return `${title} runs from ${startDate} to ${endDate}. The deadline is ${deadline}.${status}`;
  }
  if (/status|nakaboto|have i voted|did i vote|my vote/.test(question)) {
    return context.isAdmin
      ? `The current election status is ${String(election.status || "not available").toLowerCase()}. Review the election settings and live tally in the Admin Portal.`
      : "Your voting status is shown on the dashboard. After submitting a ballot, the dashboard displays your receipt and voting status; it does not reveal your candidate selections.";
  }
  if (/rule|rules|guideline|guidelines|bawal|one vote|ilang beses|terms/.test(question)) {
    return "Use your own account, vote once for each position, review your choices before submission, and do not share your login credentials. Submitted ballots are final.";
  }
  if (/help|support|problem|issue|problema|error|contact/.test(question)) {
    return context.isAdmin
      ? "For account or election-management issues, contact your system administrator. Student voters can use Help & Support on the dashboard."
      : "For account access or voting issues, open Help & Support from the student menu or contact the election administrator.";
  }
  if (/election|halalan|system|website|app|what can you|help me/.test(question)) {
    const status = election.status ? ` Current status: ${election.status}.` : "";
    return context.isAdmin
      ? `${election.title || "Elourdes Vote"} is managed from the Admin Portal. I can help with candidate profiles, student accounts, election dates and settings, activation, and the live vote tally.${status}`
      : `${election.title || "Elourdes Vote"} is the student council voting system. I can help with login, voting, results, election dates, account access, profile settings, and candidate information.${status}`;
  }

  return context.isAdmin
    ? "I can help with Elourdes Vote administration: candidates, student accounts, election settings, schedules, activation, and live tally. Please ask about one of those tasks."
    : "I can help with Elourdes Vote: login, voting, election dates and results, account access, profiles, rules, support, and candidate information. Maaari ka ring magtanong sa Filipino.";
}

function formatElectionTime(value) {
  const time = String(value).trim();
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

if (typeof module !== "undefined") {
  module.exports = { answerVotingQuestion };
}

if (typeof window !== "undefined") {
  window.answerVotingQuestion = answerVotingQuestion;
}