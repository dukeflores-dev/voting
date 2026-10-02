function normalizeChatQuestion(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function formatElectionDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value || "Not set"
    : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function answerVotingQuestion(rawQuestion, context = {}) {
  const question = normalizeChatQuestion(rawQuestion);
  const candidates = Array.isArray(context.candidates) ? context.candidates : [];
  const election = context.election || {};
  if (!question) return "Ask me about logging in, voting, election dates, results, your profile, account access, or the candidates.";

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

  if (/candidate|candidates|who is running|sino.*(candidate|kandidato)|mga kandidato|platform/.test(question)) {
    const position = candidates.find(candidate => candidate.position && question.includes(normalizeChatQuestion(candidate.position)))?.position;
    const matchingCandidates = position
      ? candidates.filter(candidate => normalizeChatQuestion(candidate.position) === normalizeChatQuestion(position))
      : candidates;
    if (!matchingCandidates.length) return "There is no candidate information available for that election position.";
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
  if (/log ?in|sign ?in|login|password.*(wrong|incorrect)|hindi.*makapasok|makapag.*login/.test(question)) {
    return "Log in with your registered Student ID and password. Your initial password is your Student ID unless you have changed it. If your credentials do not work, contact the election administrator.";
  }
  if (/how.*vote|paano.*(bumoto|boboto|mag.*vote)|cast.*vote|ballot|voting process|submit.*vote/.test(question)) {
    return "From the dashboard, choose Cast Your Vote, select one candidate for each position, review your ballot, and submit it. A submitted vote is final and cannot be changed.";
  }
  if (/who can vote|eligible|eligibility|sino.*(puwedeng|maaaring).*bumoto/.test(question)) {
    return "The system is for registered, eligible Our Lady of Lourdes College Junior High School and Senior High School students. Contact the election administrator if you are unsure whether you are eligible.";
  }
  if (/result|results|tally|winner|nanalo/.test(question)) {
    return "Open Results from the dashboard to view the election results when they are available. Results are shown after the election ends.";
  }
  if (/when|kailan|period|deadline|schedule|date|anong oras/.test(question)) {
    const title = election.title || "Student Council Election";
    const startDate = formatElectionDate(election.startDate || election.start_date);
    const endDate = formatElectionDate(election.endDate || election.end_date);
    const deadline = election.deadline || "Not set";
    return `${title} runs from ${startDate} to ${endDate}. The deadline is ${deadline}. Check the dashboard for the current election status.`;
  }
  if (/status|nakaboto|have i voted|did i vote|my vote/.test(question)) {
    return "Your voting status is shown on the dashboard. After submitting a ballot, the dashboard displays your receipt and voting status; it does not reveal your candidate selections.";
  }
  if (/rule|rules|guideline|guidelines|bawal|one vote|ilang beses|terms/.test(question)) {
    return "Use your own account, vote once for each position, review your choices before submission, and do not share your login credentials. Submitted ballots are final.";
  }
  if (/help|support|problem|issue|problema|error|contact/.test(question)) {
    return "For account access or voting issues, contact the election administrator through Help & Support on the student dashboard.";
  }
  if (/election|halalan|system|website|app|what can you|help me/.test(question)) {
    const status = election.status ? ` Current status: ${election.status}.` : "";
    return `${election.title || "Elourdes Vote"} is the student council voting system. I can help with login, voting, results, election dates, account access, profile settings, and candidate information.${status}`;
  }

  return "I can only answer questions about Elourdes Vote: login, voting, election dates and results, account access, profiles, rules, support, and candidate information. Please ask about one of those topics.";
}

if (typeof module !== "undefined") {
  module.exports = { answerVotingQuestion };
}

if (typeof window !== "undefined") {
  window.answerVotingQuestion = answerVotingQuestion;
}