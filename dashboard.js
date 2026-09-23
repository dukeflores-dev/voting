let account = null;
let currentUser = null;
let authUser = null;
let hasVoted = false;
let hasLoadedElectionStatus = false;
const accountName = document.getElementById("account-name");
const defaultCandidates = [
  { name: "Maria Santos", position: "PRESIDENT", group_name: "Uniteam", initials: "MS", description: "Leadership with integrity, service with heart.", background: "", credentials: "", achievements: "", relevant_information: "" },
  { name: "Juan Dela Cruz", position: "VICE PRESIDENT", group_name: "Uniteam", initials: "JD", description: "Together, we can build a better OLLC.", background: "", credentials: "", achievements: "", relevant_information: "" },
  { name: "Ana Reyes", position: "SECRETARY", group_name: "Uniteam", initials: "AR", description: "Organized today, empowered tomorrow.", background: "", credentials: "", achievements: "", relevant_information: "" }
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
window.elourdesCandidates = candidates;
window.elourdesElection = election;
initializeDashboard();
window.setInterval(() => {
  updateCountdown();
  updateElectionState();
}, 1000);
window.setInterval(refreshElectionStatus, 5000);

async function initializeDashboard() {
  const storedUserRole = (() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("elourdesCurrentUser") || "null");
      return storedUser?.role || "voter";
    } catch {
      return "voter";
    }
  })();

  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    if (storedUserRole === "admin") {
      localStorage.removeItem("elourdesCurrentUser");
    }
    window.location.replace("index.html");
    return;
  }

  authUser = data.user;
  const resolvedRole = storedUserRole === "admin" ? "admin" : (authUser.app_metadata?.role || authUser.user_metadata?.role || "voter");
  currentUser = {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email,
    username: authUser.email,
    role: resolvedRole
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

  const { data: electionData, error: electionError } = await supabaseClient.from("elections").select("*").eq("id", 1).single();
  if (electionError) {
    showToast("Election settings could not be loaded. Please refresh and try again.");
  } else if (electionData) {
    election = {
      ...electionData,
      status: String(electionData.status || "").trim().toLowerCase(),
      startDate: electionData.start_date || election.startDate,
      endDate: electionData.end_date || election.endDate,
      deadline: electionData.deadline || election.deadline,
      eligibleVoters: electionData.eligible_voters || election.eligibleVoters
    };
  }
  window.elourdesElection = election;
  hasLoadedElectionStatus = true;

  const { data: candidateData } = await supabaseClient.from("candidates").select("*").eq("election_id", 1).order("id");
  if (candidateData) candidates = candidateData.map(candidate => ({ ...candidate, picture: candidate.image_url || "" }));
  window.elourdesCandidates = candidates;

  const { data: ballot } = await supabaseClient.from("vote_ballots").select("id, created_at").eq("election_id", 1).eq("voter_id", authUser.id).maybeSingle();
  hasVoted = Boolean(ballot);
  if (hasVoted && ballot.created_at) saveVoteReceipt(ballot.created_at);
  accountName.textContent = `Welcome, ${currentUser.name}`;
  renderCandidates();
  renderElectionDetails();
  updateVotingStatus();
  updateCountdown();
  updateElectionState();
}

async function refreshElectionStatus() {
  if (!authUser) return;

  const { data, error } = await supabaseClient
    .from("elections")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data) return;

  const previousStatus = String(election.status || "").trim().toLowerCase();
  const nextStatus = String(data.status || "").trim().toLowerCase();
  election = {
    ...data,
    status: nextStatus,
    startDate: data.start_date || election.startDate,
    endDate: data.end_date || election.endDate,
    deadline: data.deadline || election.deadline,
    eligibleVoters: data.eligible_voters || election.eligibleVoters
  };
  window.elourdesElection = election;

  if (hasLoadedElectionStatus && previousStatus !== "active" && nextStatus === "active") {
    showToast("Voting is now active. You can cast your vote.");
  }

  renderElectionDetails();
  updateCountdown();
  updateElectionState();
}

async function logout() {
  const confirmed = window.confirm("Are you sure you want to log out?");
  if (!confirmed) return;

  await supabaseClient.auth.signOut();
  window.location.replace("index.html");
}

function toggleStudentMenu() {
  document.getElementById("student-menu").classList.toggle("open");
}

function showDashboardView(view) {
  document.body.classList.remove("candidates-only-view");
  document.body.classList.remove("dashboard-view-status", "dashboard-view-candidates", "dashboard-view-election", "dashboard-view-guidelines", "dashboard-view-notifications", "dashboard-view-results");
  if (view !== "home") document.body.classList.add(`dashboard-view-${view}`);

  document.querySelectorAll(".main-nav a[data-view]").forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });
  document.getElementById("home-content").hidden = false;
  document.getElementById("candidates-page").hidden = true;
  document.getElementById("student-menu").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function showDashboardResults() {
  if (!electionHasEnded()) {
    showToast("Election results will be available after the election ends.");
    return;
  }
  if (!hasVoted) {
    showToast("Results are available after you submit your vote.");
    return;
  }

  showDashboardView("results");
  await renderStudentResults();
  document.getElementById("student-results").hidden = false;
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
  showDashboardView("home");
  document.getElementById("candidates-page").hidden = true;
  document.getElementById("home-content").hidden = false;
}

const candidatePositionOrder = ["PRESIDENT", "VICE PRESIDENT", "SECRETARY", "TREASURER", "AUDITOR", "PUBLIC INFORMATION OFFICER", "PEACE OFFICER"];

function getCandidateGroup(candidate) {
  return (candidate.group_name || candidate.group || candidate.team || candidate.party || "Independent").trim() || "Independent";
}

function groupCandidatesByGroup(candidateList = candidates) {
  const grouped = candidateList.reduce((groups, candidate) => {
    const group = getCandidateGroup(candidate);
    (groups[group] ||= []).push(candidate);
    return groups;
  }, {});

  return Object.entries(grouped).sort(([first], [second]) => first.localeCompare(second));
}

function sortCandidatesByPosition(groupCandidates) {
  return groupCandidates.sort((first, second) => {
    const firstPosition = (first.position || "Other").trim();
    const secondPosition = (second.position || "Other").trim();
    const firstIndex = candidatePositionOrder.indexOf(firstPosition.toUpperCase());
    const secondIndex = candidatePositionOrder.indexOf(secondPosition.toUpperCase());
    const positionDifference = (firstIndex === -1 ? candidatePositionOrder.length : firstIndex) - (secondIndex === -1 ? candidatePositionOrder.length : secondIndex);
    return positionDifference || firstPosition.localeCompare(secondPosition) || first.name.localeCompare(second.name);
  });
}

function renderAllCandidates() {
  const list = document.getElementById("all-candidates-list");
  list.innerHTML = renderCandidatesByPosition(candidates, "full-candidate-card");
}

function renderCandidatesByPosition(candidateList, cardClass = "candidate") {
  const positions = [...new Set(sortCandidatesByPosition([...candidateList]).map(candidate => candidate.position || "Other"))];
  return positions.map(position => `
    <section class="candidate-group">
      <h3 class="candidate-group-title">${escapeHtml(position)}</h3>
      <div class="candidate-group-list">
        ${candidateList.filter(candidate => (candidate.position || "Other") === position).sort((first, second) => first.name.localeCompare(second.name)).map((candidate, index) => cardClass === "full-candidate-card" ? `
          <article class="full-candidate-card">
            ${candidate.picture ? `<img class="full-candidate-avatar profile-picture" src="${candidate.picture}" alt="${escapeHtml(candidate.name)}" onclick="openCandidateImage('${escapeJs(candidate.picture)}')">` : `<div class="full-candidate-avatar avatar-${index % 3 + 1}" onclick="openCandidateImage('')">${escapeHtml(candidate.initials)}</div>`}
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
        ` : `
          <article class="candidate">
            ${candidate.picture ? `<img class="avatar profile-picture candidate-image-trigger" src="${candidate.picture}" alt="${escapeHtml(candidate.name)}" onclick="openCandidateImage('${escapeJs(candidate.picture)}')">` : `<div class="avatar avatar-${index % 3 + 1}">${escapeHtml(candidate.initials)}</div>`}
            <h3>${escapeHtml(candidate.name)}</h3>
            <small>${escapeHtml(candidate.position)}</small>
            <p>${escapeHtml(candidate.description || candidate.platform || "No description available yet.")}</p>
            <div class="candidate-actions">
              <button type="button" onclick="selectCandidate('${escapeJs(candidate.name)}')">VIEW PROFILE</button>
              <button type="button" onclick="startVoting()">VOTE</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
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
    ? notifications.map(notification => `<div class="notification-item"><strong>${escapeHtml(notification.message)}</strong>${notification.status ? `<span>Status: ${escapeHtml(notification.status)}</span>` : ""}${notification.electionName ? `<span>Election: ${escapeHtml(notification.electionName)}</span>` : ""}<span>${new Date(notification.date).toLocaleString()}</span></div>`).join("")
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

function updateCountdown() {
  const countdown = document.getElementById("election-countdown");
  if (!countdown) return;

  if (String(election.status || "").trim().toLowerCase() === "active") {
    countdown.textContent = hasVoted ? "Vote submitted successfully" : "Election is active";
    return;
  }

  const start = getElectionStart();
  const end = getElectionEnd();
  const now = new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    countdown.textContent = "Schedule unavailable";
    return;
  }
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
  const status = String(election.status || "").trim().toLowerCase();
  if (status === "active") return false;
  if (status === "closed") return true;
  return new Date().getTime() >= getElectionEnd().getTime();
}

function electionHasStarted() {
  const status = String(election.status || "").trim().toLowerCase();
  if (status === "active") return true;
  if (status === "closed") return false;
  return new Date().getTime() >= getElectionStart().getTime();
}

function updateElectionState() {
  const ended = electionHasEnded();
  const started = electionHasStarted();
  const title = document.getElementById("status-title");
  const text = document.getElementById("status-text");
  const badge = document.getElementById("election-status-badge");
  const buttons = document.querySelectorAll("[onclick*='startVoting']");
  buttons.forEach(button => {
    button.disabled = hasVoted || ended || !started;
    if (ended && button.id !== "cast-vote-button") button.textContent = "VOTING CLOSED";
    if (!started && button.id !== "cast-vote-button") button.textContent = "VOTING NOT STARTED";
    if (hasVoted && button.id !== "cast-vote-button") button.textContent = "VOTE SUBMITTED";
    else if (started && !ended && button.id !== "cast-vote-button") button.textContent = "VOTE";
  });

  if (badge) {
    badge.textContent = ended ? "CLOSED" : started ? "ONGOING" : "UPCOMING";
    badge.classList.toggle("is-closed", ended);
    badge.classList.toggle("is-live", started && !ended);
  }

  const castButton = document.getElementById("cast-vote-button");
  if (hasVoted) {
  let hasLoadedElectionStatus = false;
    document.querySelector(".dashboard").classList.remove("results-only");
    title.textContent = "VOTE RECORDED";
    text.textContent = "Your vote has been successfully recorded.";
    castButton.disabled = true;
    castButton.textContent = "VOTE SUBMITTED";
  window.setInterval(refreshElectionStatus, 5000);
  } else if (ended) {
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
  const { data: ballots, error } = await supabaseClient.rpc("get_election_results", { requested_election_id: 1 });
  if (error) { showToast("Results could not be loaded."); return; }
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
  if (error) { showToast("Your name could not be updated."); return; }
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
  const imageButton = document.getElementById("profile-image-button");
  profileAvatar.textContent = candidate.picture ? "" : candidate.initials;
  profileAvatar.style.backgroundImage = candidate.picture ? `url("${candidate.picture}")` : "";
  profileAvatar.classList.toggle("has-picture", Boolean(candidate.picture));
  imageButton.dataset.image = candidate.picture || "";
  document.getElementById("profile-name").textContent = candidate.name;
  document.getElementById("profile-position").textContent = candidate.position;
  document.getElementById("profile-description").textContent = candidate.description || candidate.platform || "No description available yet.";
  document.getElementById("profile-background").textContent = candidate.background || "Not provided yet.";
  document.getElementById("profile-credentials").textContent = candidate.credentials || "Not provided yet.";
  document.getElementById("profile-achievements").textContent = candidate.achievements || "Not provided yet.";
  document.getElementById("profile-relevant-information").textContent = candidate.relevant_information || "Not provided yet.";
  document.getElementById("profile-modal").hidden = false;
}

function openCandidateImage(imageUrl) {
  const largeImage = document.getElementById("candidate-image-large");
  const imageModal = document.getElementById("candidate-image-modal");
  const resolvedUrl = imageUrl || document.getElementById("profile-image-button")?.dataset?.image || "";
  if (!resolvedUrl) {
    return;
  }
  largeImage.src = resolvedUrl;
  imageModal.hidden = false;
}

function closeCandidateImage() {
  document.getElementById("candidate-image-modal").hidden = true;
}

function closeProfile() {
  document.getElementById("profile-modal").hidden = true;
}

function renderCandidates() {
  renderCandidateGroups(candidates);
}

function renderCandidateGroups(candidateList) {
  const list = document.getElementById("candidate-list");
  if (!candidateList.length) {
    list.innerHTML = '<p class="candidate-search-empty">No candidates are available yet.</p>';
    list.classList.add("candidate-list-empty");
    return;
  }
  list.classList.remove("candidate-list-empty");
  list.innerHTML = renderCandidatesByPosition(candidateList);
}

function searchCandidates(event) {
  const query = event.target.value.trim().toLowerCase();
  const autocomplete = document.getElementById("candidate-autocomplete");
  const matches = query
    ? candidates.filter(candidate => [candidate.name, candidate.position, getCandidateGroup(candidate)].some(value => value?.toLowerCase().includes(query))).slice(0, 8)
    : [];

  autocomplete.innerHTML = matches.length
    ? matches.map(candidate => `<button type="button" class="candidate-suggestion" role="option" onclick="selectCandidateSearchResult('${escapeJs(candidate.name)}')"><strong>${escapeHtml(candidate.name)}</strong><span>${escapeHtml(getCandidateGroup(candidate))} - ${escapeHtml(candidate.position)}</span></button>`).join("")
    : (query ? '<p class="candidate-no-results">No candidates found.</p>' : "");
  autocomplete.hidden = !query;

  renderCandidateGroups(query
    ? candidates.filter(candidate => [candidate.name, candidate.position, getCandidateGroup(candidate)].some(value => value?.toLowerCase().includes(query)))
    : []);
}

function selectCandidateSearchResult(candidateName) {
  const candidate = candidates.find(item => item.name === candidateName);
  const input = document.getElementById("candidate-search-input");
  const autocomplete = document.getElementById("candidate-autocomplete");
  if (!candidate) return;
  input.value = candidate.name;
  autocomplete.hidden = true;
  selectCandidate(candidate.name);
}

function showVotingGuidelines() {
  document.getElementById("vote-guidelines-modal").hidden = false;
  document.getElementById("guidelines-confirm-checkbox").checked = false;
}

function openQuickGuide() {
  document.getElementById("quick-guide-modal").hidden = false;
}

function closeQuickGuide() {
  document.getElementById("quick-guide-modal").hidden = true;
}

function closeVotingGuidelines() {
  document.getElementById("vote-guidelines-modal").hidden = true;
}

function continueVotingFromGuidelines() {
  const checkbox = document.getElementById("guidelines-confirm-checkbox");
  if (!checkbox.checked) {
    showToast("Please confirm that you reviewed the voting guidelines before continuing.");
    return;
  }
  closeVotingGuidelines();
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

  showVotingGuidelines();
}

function closeBallot() {
  document.getElementById("ballot-modal").hidden = true;
}

function reviewBallotBeforeSubmit() {
  const ballotModal = document.getElementById("ballot-modal");
  const reviewModal = document.getElementById("ballot-review-modal");
  const form = ballotModal.querySelector("form");
  if (!form) return;

  const formData = new FormData(form);
  const selections = Object.fromEntries(formData.entries());
  const positions = [...new Set(candidates.map(candidate => candidate.position))];

  const incomplete = positions.some(position => !selections[position]);
  if (incomplete) {
    showToast("Please select a candidate for each position before reviewing your ballot.");
    return;
  }

  const reviewList = document.getElementById("ballot-review-list");
  reviewList.innerHTML = positions.map(position => `
    <div class="review-row">
      <input type="hidden" name="${escapeHtml(position)}" value="${escapeHtml(selections[position])}">
      <strong>${escapeHtml(position)}</strong>
      <span>${escapeHtml(selections[position])}</span>
    </div>
  `).join("");

  ballotModal.hidden = true;
  reviewModal.hidden = false;
}

function closeBallotReview() {
  document.getElementById("ballot-review-modal").hidden = true;
  document.getElementById("ballot-modal").hidden = false;
}

async function submitVote(event) {
  event.preventDefault();
  if (electionHasEnded()) {
    closeBallot();
    closeBallotReview();
    updateElectionState();
    showToast("Voting is closed. Your vote was not submitted.");
    return;
  }
  const ballotReview = document.getElementById("ballot-review-modal");
  const formData = new FormData(ballotReview.querySelector("form"));
  const selections = Object.fromEntries(formData.entries());
  const { error } = await supabaseClient.from("vote_ballots").insert({ election_id: 1, voter_id: authUser.id, selections });
  if (error) {
    showToast(error.code === "23505" ? "You have already submitted your vote." : "Your vote could not be submitted.");
    return;
  }
  hasVoted = true;
  addVoteConfirmationNotification();
  closeBallot();
  closeBallotReview();
  updateVotingStatus();
  showToast("Your vote was submitted successfully.");
}

function getVoteReceiptKey() {
  return authUser ? `elourdesVoteReceipt:${authUser.id}` : "elourdesVoteReceipt";
}

function saveVoteReceipt(votedAt) {
  const receipt = {
    status: "Voted",
    votedAt,
    electionName: election.title
  };
  localStorage.setItem(getVoteReceiptKey(), JSON.stringify(receipt));
  return receipt;
}

function addVoteConfirmationNotification(votedAt = new Date().toISOString()) {
  const receipt = saveVoteReceipt(votedAt);
  const notifications = JSON.parse(localStorage.getItem("elourdesNotifications") || "[]");
  notifications.unshift({
    message: "Voting receipt: Successfully submitted.",
    status: receipt.status,
    electionName: receipt.electionName,
    date: receipt.votedAt
  });
  localStorage.setItem("elourdesNotifications", JSON.stringify(notifications.slice(0, 10)));
}

async function confirmVoteSubmission(event) {
  event.preventDefault();
  const reviewForm = event.target;
  const formData = new FormData(reviewForm);
  const selections = Object.fromEntries(formData.entries());
  const positionNames = [...new Set(candidates.map(candidate => candidate.position))];
  const missingSelection = positionNames.some(position => !selections[position]);
  if (missingSelection) {
    showToast("Please complete all selections before submitting your vote.");
    return;
  }

  const { error } = await supabaseClient.from("vote_ballots").insert({ election_id: 1, voter_id: authUser.id, selections });
  if (error) {
    showToast(error.code === "23505" ? "You have already submitted your vote." : "Your vote could not be submitted.");
    return;
  }

  hasVoted = true;
  addVoteConfirmationNotification();
  closeBallotReview();
  updateVotingStatus();
  showToast("Vote submitted successfully. A confirmation receipt has been recorded.");
}

function updateVotingStatus() {
  const title = document.getElementById("status-title");
  const text = document.getElementById("status-text");
  const button = document.getElementById("cast-vote-button");

  if (hasVoted) {
    const receipt = JSON.parse(localStorage.getItem(getVoteReceiptKey()) || "null");
    title.textContent = "VOTE RECORDED";
    text.textContent = "Your vote has been successfully recorded.";
    button.disabled = true;
    button.textContent = "VOTE SUBMITTED";
    const confirmation = document.getElementById("vote-confirmation");
    if (confirmation) {
      confirmation.hidden = false;
      document.getElementById("vote-receipt-status").textContent = receipt?.status || "Voted";
      document.getElementById("vote-receipt-date").textContent = receipt?.votedAt ? new Date(receipt.votedAt).toLocaleString() : "Recorded date unavailable";
      document.getElementById("vote-receipt-election").textContent = receipt?.electionName || election.title;
    }
  } else {
    const confirmation = document.getElementById("vote-confirmation");
    if (confirmation) confirmation.hidden = true;
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
  if (!isImportantNotification(text)) return;
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function isImportantNotification(text) {
  const message = String(text).toLowerCase();
  return message.includes("vote submitted successfully")
    || message.includes("vote was submitted successfully")
    || message.includes("voting is now active");
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}

function escapeJs(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
