let account = null;
let currentUser = null;
let authUser = null;
let hasVoted = false;
const accountName = document.getElementById("account-name");
const defaultCandidates = [
  { name: "Maria Santos", position: "PRESIDENT", initials: "MS", description: "Leadership with integrity, service with heart." },
  { name: "Juan Dela Cruz", position: "VICE PRESIDENT", initials: "JD", description: "Together, we can build a better OLLC." },
  { name: "Ana Reyes", position: "SECRETARY", initials: "AR", description: "Organized today, empowered tomorrow." }
];
const defaultElection = {
  title: "Student Council Election 2026",
  startDate: "2026-05-20",
  endDate: "2026-05-23",
  deadline: "23:59",
  eligibleVoters: 100
};
let election = JSON.parse(localStorage.getItem("elourdesElection") || "null") || defaultElection;

let candidates = JSON.parse(localStorage.getItem("elourdesCandidates") || "null") || defaultCandidates;
initializeDashboard();
window.setInterval(() => {
  updateCountdown();
  refreshElectionSettings();
  updateElectionState();
}, 1000);
window.addEventListener("storage", refreshElectionSettings);

async function initializeDashboard() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    window.location.replace("index.html");
    return;
  }

  authUser = data.user;
  currentUser = {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email,
    username: authUser.email,
    role: authUser.app_metadata?.role || "voter"
  };
  account = {
    fullName: currentUser.name,
    studentId: authUser.user_metadata?.student_id || "Not available",
    email: authUser.email
  };

  if (currentUser.role === "admin") {
    window.location.replace("admin.html");
    return;
  }

  const { data: electionData } = await supabaseClient
    .from("elections")
    .select("*")
    .eq("id", 1)
    .single();
  if (electionData) {
    election = {
      ...electionData,
      startDate: electionData.start_date || election.startDate,
      endDate: electionData.end_date || election.endDate,
      deadline: electionData.deadline || election.deadline,
      eligibleVoters: electionData.eligible_voters || election.eligibleVoters
    };
  }

  const { data: candidateData } = await supabaseClient
    .from("candidates")
    .select("*")
    .eq("election_id", 1)
    .order("id");
  if (candidateData) {
    candidates = candidateData.map(candidate => ({
      ...candidate,
      picture: candidate.image_url || ""
    }));
  }

  const { data: ballot } = await supabaseClient
    .from("vote_ballots")
    .select("id")
    .eq("election_id", 1)
    .eq("voter_id", authUser.id)
    .maybeSingle();
  hasVoted = Boolean(ballot);
  accountName.textContent = `Welcome, ${currentUser.name}`;
  renderCandidates();
  renderElectionDetails();
  updateVotingStatus();
  updateCountdown();
  updateElectionState();
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.replace("index.html");
}

function toggleStudentMenu() {
  document.getElementById("student-menu").classList.toggle("open");
}

function showCandidates() {
  renderAllCandidates();
  document.body.classList.add("candidates-only-view");
  document.getElementById("home-content").hidden = true;
  document.getElementById("candidates-page").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStudentHome() {
  document.body.classList.remove("candidates-only-view");
  document.getElementById("candidates-page").hidden = true;
  document.getElementById("home-content").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAllCandidates() {
  const list = document.getElementById("all-candidates-list");
  list.innerHTML = candidates.map((candidate, index) => `
    <article class="full-candidate-card">
      ${candidate.picture ? `<img class="full-candidate-avatar profile-picture" src="${candidate.picture}" alt="${escapeHtml(candidate.name)}">` : `<div class="full-candidate-avatar avatar-${index % 3 + 1}">${escapeHtml(candidate.initials)}</div>`}
      <div class="full-candidate-info">
        <h3>${escapeHtml(candidate.name)}</h3>
        <span class="full-candidate-position">${escapeHtml(candidate.position)}</span>
        <p>${escapeHtml(candidate.description || candidate.platform || "No description available yet.")}</p>
        <div class="full-candidate-actions">
          <button type="button" onclick="selectCandidate('${escapeJs(candidate.name)}')">VIEW PROFILE</button>
          <button type="button" onclick="startVoting()">VOTE</button>
        </div>
      </div>
    </article>
  `).join("");
}

function showElectionResults() {
  if (!electionHasEnded()) {
    showToast("Election results will be available after the countdown ends.");
    return;
  }
  if (!hasVoted) {
    showToast("Results are available after you submit your vote and the election ends.");
    return;
  }
  renderStudentResults();
  document.getElementById("student-results").hidden = false;
  document.getElementById("student-results").scrollIntoView({ behavior: "smooth" });
  showToast("Election Results");
}

function showSupport() {
  document.getElementById("support-modal").hidden = false;
}

function closeSupport() {
  document.getElementById("support-modal").hidden = true;
}

function openNotifications(event) {
  if (event) event.preventDefault();
  renderNotifications();
  document.getElementById("notifications-modal").hidden = false;
}

function closeNotifications() {
  document.getElementById("notifications-modal").hidden = true;
}

function renderNotifications() {
  const list = document.getElementById("notification-list");
  const notifications = JSON.parse(localStorage.getItem("elourdesNotifications") || "[]");
  list.innerHTML = notifications.length
    ? notifications.map(notification => `<div class="notification-item"><strong>${escapeHtml(notification.message)}</strong><span>${new Date(notification.date).toLocaleString()}</span></div>`).join("")
    : "<p class=\"empty-notification\">No new notifications.</p>";
}

function renderElectionDetails() {
  const title = document.getElementById("student-election-title");
  const titleMain = document.getElementById("student-election-title-main");
  const period = document.getElementById("student-election-period");
  const periodStatus = document.getElementById("student-election-period-status");
  const metrics = document.getElementById("student-eligible-voters");
  if (title) title.textContent = election.title;
  if (titleMain) titleMain.textContent = election.title;
  if (period) period.innerHTML = `${formatDate(election.startDate)} - ${formatDate(election.endDate)} | ${formatTime(election.deadline)}`;
  if (periodStatus) periodStatus.textContent = `${formatDate(election.startDate)} - ${formatDate(election.endDate)} | ${formatTime(election.deadline)}`;
  if (metrics) metrics.innerHTML = `All currently enrolled<br>${election.eligibleVoters} eligible voters`;
}

function refreshElectionSettings() {
  const savedElection = JSON.parse(localStorage.getItem("elourdesElection") || "null");
  if (!savedElection || JSON.stringify(savedElection) === JSON.stringify(election)) return;
  election = savedElection;
  renderElectionDetails();
  updateCountdown();
}

function updateCountdown() {
  const countdown = document.getElementById("election-countdown");
  if (!countdown) return;

  const start = getElectionStart();
  const end = getElectionEnd();
  const now = new Date();
  const target = now < start ? start : end;
  const difference = Math.max(0, target.getTime() - now.getTime());

  if (difference <= 0) {
    countdown.textContent = now >= end ? "Election ended" : "Election is starting";
    return;
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  countdown.textContent = `${days} Days : ${String(hours).padStart(2, "0")} Hours : ${String(minutes).padStart(2, "0")} Minutes : ${String(seconds).padStart(2, "0")} Seconds`;
}

function getElectionStart() {
  return new Date(`${election.startDate}T00:00:00`);
}

function getElectionEnd() {
  return new Date(`${election.endDate}T${election.deadline}:00`);
}

function electionHasEnded() {
  return new Date().getTime() >= getElectionEnd().getTime();
}

function electionHasStarted() {
  return new Date().getTime() >= getElectionStart().getTime();
}

function updateElectionState() {
  const ended = electionHasEnded();
  const started = electionHasStarted();
  const title = document.getElementById("status-title");
  const text = document.getElementById("status-text");
  const buttons = document.querySelectorAll("[onclick*='startVoting']");
  buttons.forEach(button => {
    button.disabled = ended || !started;
    if (ended && button.id !== "cast-vote-button") button.textContent = "VOTING CLOSED";
    if (!started && button.id !== "cast-vote-button") button.textContent = "VOTING NOT STARTED";
    if (started && !ended && button.id !== "cast-vote-button") button.textContent = "VOTE";
  });

  const castButton = document.getElementById("cast-vote-button");
  if (ended) {
    title.textContent = "ELECTION CLOSED";
    text.textContent = "Voting has ended. Final results are now available.";
    castButton.disabled = true;
    castButton.textContent = "VOTING CLOSED";
    if (hasVoted) {
      renderStudentResults();
      document.querySelector(".dashboard").classList.add("results-only");
    }
  } else if (!started) {
    title.textContent = "NOT STARTED";
    text.textContent = `Voting opens on ${formatDate(election.startDate)}.`;
    castButton.disabled = true;
    castButton.textContent = "VOTING NOT STARTED";
  } else {
    document.querySelector(".dashboard").classList.remove("results-only");
    castButton.disabled = false;
    castButton.textContent = "CAST YOUR VOTE";
    updateVotingStatus();
  }
}

async function renderStudentResults() {
  const resultsCard = document.getElementById("student-results");
  const resultsList = document.getElementById("student-results-list");
  const { data: ballots, error } = await supabaseClient
    .rpc("get_election_results", { requested_election_id: 1 });
  if (error) {
    showToast("Results could not be loaded.");
    return;
  }
  const tally = {};

  candidates.forEach(candidate => {
    if (!tally[candidate.position]) tally[candidate.position] = [];
    tally[candidate.position].push({ name: candidate.name, votes: 0 });
  });

  (ballots || []).forEach(record => {
    const candidate = tally[record.candidate_position]?.find(item => item.name === record.candidate_name);
    if (candidate) candidate.votes += Number(record.vote_count);
  });

  resultsList.innerHTML = Object.entries(tally).map(([position, entries]) => {
    entries.sort((first, second) => second.votes - first.votes || first.name.localeCompare(second.name));
    const total = entries.reduce((sum, item) => sum + item.votes, 0);
    return `<section class="student-result-group"><h3>${escapeHtml(position)}</h3>${entries.map(item => {
      const percent = total ? Math.round(item.votes / total * 100) : 0;
      return `<div class="student-result-row"><strong>${escapeHtml(item.name)}</strong><span>${item.votes} vote${item.votes === 1 ? "" : "s"} | ${percent}%</span><div><i style="width: ${percent}%"></i></div></div>`;
    }).join("")}</section>`;
  }).join("");
  resultsCard.hidden = false;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(value) {
  const [hours, minutes] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function openStudentProfile() {
  document.getElementById("student-profile-name").textContent = account?.fullName || currentUser?.name || "Student Voter";
  document.getElementById("student-profile-id").textContent = account?.studentId || currentUser?.username || "Not available";
  document.getElementById("student-profile-email").textContent = account?.email || "Not available";
  document.getElementById("student-profile-status").textContent = hasVoted ? "Voted" : "Not yet voted";
  document.getElementById("student-profile-modal").hidden = false;
}

function closeStudentProfile() {
  document.getElementById("student-profile-modal").hidden = true;
}

function editStudentName() {
  const nameInput = document.getElementById("student-name-input");
  nameInput.value = account?.fullName || currentUser?.name || "";
  document.getElementById("student-name-form").hidden = false;
  nameInput.focus();
}

async function saveStudentName(event) {
  event.preventDefault();
  const newName = document.getElementById("student-name-input").value.trim();
  if (!newName) return;

  const { error } = await supabaseClient.auth.updateUser({ data: { full_name: newName } });
  if (error) {
    showToast("Your name could not be updated.");
    return;
  }
  account.fullName = newName;
  currentUser.name = newName;

  document.getElementById("student-profile-name").textContent = newName;
  accountName.innerHTML = `Welcome<br><small>${escapeHtml(newName)}</small>`;
  document.getElementById("student-name-form").hidden = true;
  showToast("Your name was updated successfully.");
}

function selectCandidate(name) {
  const candidate = candidates.find(item => item.name === name);
  if (!candidate) return;

  const profileAvatar = document.getElementById("profile-initials");
  profileAvatar.textContent = candidate.picture ? "" : candidate.initials;
  profileAvatar.style.backgroundImage = candidate.picture ? `url("${candidate.picture}")` : "";
  profileAvatar.classList.toggle("has-picture", Boolean(candidate.picture));
  document.getElementById("profile-name").textContent = candidate.name;
  document.getElementById("profile-position").textContent = candidate.position;
  document.getElementById("profile-description").textContent = candidate.description || candidate.platform || "No description available yet.";
  document.getElementById("profile-modal").hidden = false;
}

function closeProfile() {
  document.getElementById("profile-modal").hidden = true;
}

function renderCandidates() {
  const list = document.getElementById("candidate-list");
  list.innerHTML = candidates.map((candidate, index) => `
    <article class="candidate">
      ${candidate.picture ? `<img class="avatar profile-picture" src="${candidate.picture}" alt="${escapeHtml(candidate.name)}">` : `<div class="avatar avatar-${index % 3 + 1}">${escapeHtml(candidate.initials)}</div>`}
      <h3>${escapeHtml(candidate.name)}</h3>
      <small>${escapeHtml(candidate.position)}</small>
      <p>${escapeHtml(candidate.description || candidate.platform || "No description available yet.")}</p>
      <div class="candidate-actions">
        <button type="button" onclick="selectCandidate('${escapeJs(candidate.name)}')">VIEW PROFILE</button>
        <button type="button" onclick="startVoting()">VOTE</button>
      </div>
    </article>
  `).join("");
}

function showAllCandidates() {
  document.getElementById("candidates").scrollIntoView({ behavior: "smooth" });
  showToast(`${candidates.length} candidate${candidates.length === 1 ? "" : "s"} available.`);
}

function startVoting() {
  if (!electionHasStarted()) {
    showToast(`Voting opens on ${formatDate(election.startDate)}.`);
    return;
  }

  if (electionHasEnded()) {
    updateElectionState();
    showToast("Voting is closed. Final results are now available.");
    return;
  }

  if (hasVoted) {
    showToast("You have already submitted your vote.");
    return;
  }

  const positions = [...new Set(candidates.map(candidate => candidate.position))];
  document.getElementById("ballot-fields").innerHTML = positions.map(position => `
    <fieldset class="ballot-position">
      <legend>${escapeHtml(position)}</legend>
      ${candidates.filter(candidate => candidate.position === position).map(candidate => `
        <label class="ballot-option"><input type="radio" name="${escapeHtml(position)}" value="${escapeHtml(candidate.name)}" required><span>${escapeHtml(candidate.name)}</span></label>
      `).join("")}
    </fieldset>
  `).join("");
  document.getElementById("ballot-modal").hidden = false;
}

function closeBallot() {
  document.getElementById("ballot-modal").hidden = true;
}

async function submitVote(event) {
  event.preventDefault();
  if (electionHasEnded()) {
    closeBallot();
    updateElectionState();
    showToast("Voting is closed. Your vote was not submitted.");
    return;
  }
  const formData = new FormData(event.target);
  const selections = Object.fromEntries(formData.entries());
  const { error } = await supabaseClient.from("vote_ballots").insert({
    election_id: 1,
    voter_id: authUser.id,
    selections
  });
  if (error) {
    showToast(error.code === "23505" ? "You have already submitted your vote." : "Your vote could not be submitted.");
    return;
  }
  hasVoted = true;
  closeBallot();
  updateVotingStatus();
  showToast("Your vote was submitted successfully.");
}

function updateVotingStatus() {
  if (electionHasEnded() || !electionHasStarted()) return;
  const title = document.getElementById("status-title");
  const text = document.getElementById("status-text");
  const button = document.getElementById("cast-vote-button");

  if (hasVoted) {
    title.textContent = "VOTED";
    text.textContent = "Your vote has been submitted.";
    button.disabled = true;
    button.textContent = "VOTE SUBMITTED";
  }
}

function startVotingLegacy() {
  document.getElementById("candidates").scrollIntoView({ behavior: "smooth" });
  showToast("Review the candidates before voting.");
}

function showGuidelines() {
  document.getElementById("guidelines").scrollIntoView({ behavior: "smooth" });
  showToast("Please review the voting steps before submitting.");
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}

function escapeJs(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
