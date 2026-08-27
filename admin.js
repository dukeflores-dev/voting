let adminUser = null;
const adminName = document.getElementById("admin-name");
const defaultCandidates = [
  { name: "Maria Santos", position: "PRESIDENT", initials: "MS", description: "Leadership with integrity, service with heart." },
  { name: "Juan Dela Cruz", position: "VICE PRESIDENT", initials: "JD", description: "Together, we can build a better OLLC." },
  { name: "Ana Reyes", position: "SECRETARY", initials: "AR", description: "Organized today, empowered tomorrow." }
];

let candidates = [];
let candidateUndoStack = [];
let candidateRedoStack = [];
const defaultElection = {
  title: "Student Council Election 2026",
  startDate: "2026-05-20",
  endDate: "2026-05-23",
  deadline: "23:59",
  eligibleVoters: 100
};
let election = null;
let electionId = 1;
let totalVotes = 0;
initializeAdmin();
window.setInterval(updateResults, 1000);
window.setInterval(updateSystemTime, 1000);

async function initializeAdmin() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user || data.user.app_metadata?.role !== "admin") {
    window.location.replace("dashboard.html");
    return;
  }
  adminUser = data.user;
  adminName.textContent = adminUser.user_metadata?.full_name || adminUser.email;
  document.getElementById("profile-admin-name").textContent = adminUser.user_metadata?.full_name || "Administrator";
  document.getElementById("profile-admin-username").textContent = adminUser.email;
  await loadElection();
  await loadCandidates();
  renderCandidates();
  updateHistoryButtons();
  renderElectionSettings();
  await updateResults();
}

async function loadElection() {
  const { data, error } = await supabaseClient.from("elections").select("*").eq("id", electionId).single();
  if (error) { showAdminToast("Election data could not be loaded."); return; }
  election = { ...data, startDate: data.start_date, endDate: data.end_date, eligibleVoters: data.eligible_voters };
}

async function loadCandidates() {
  const { data, error } = await supabaseClient.from("candidates").select("*").eq("election_id", electionId).order("id");
  if (error) { showAdminToast("Candidate data could not be loaded."); return; }
  candidates = (data || []).map(candidate => ({ ...candidate, picture: candidate.image_url || "" }));
}

function renderCandidates() {
  document.getElementById("candidate-count").textContent = candidates.length;
  document.getElementById("admin-candidate-list").innerHTML = candidates.map((candidate, index) => `
    <article class="admin-candidate">
      ${candidate.picture ? `<img class="admin-avatar profile-picture" src="${candidate.picture}" alt="${escapeHtml(candidate.name)}">` : `<div class="admin-avatar">${escapeHtml(candidate.initials)}</div>`}
      <h3>${escapeHtml(candidate.name)}</h3>
      <small>${escapeHtml(candidate.position)}</small>
      <p>${escapeHtml(candidate.description || candidate.platform || "No description available yet.")}</p>
      <div class="admin-actions">
        <button type="button" onclick="openCandidateForm(${index})">EDIT</button>
        <button type="button" class="delete-button" onclick="deleteCandidate(${index})">DELETE</button>
      </div>
    </article>
  `).join("");
}

function openCandidateForm(index = -1) {
  document.getElementById("candidate-form-title").textContent = index < 0 ? "Add Candidate" : "Edit Candidate";
  document.getElementById("candidate-index").value = index;
  document.getElementById("candidate-name").value = index < 0 ? "" : candidates[index].name;
  document.getElementById("candidate-position").value = index < 0 ? "" : candidates[index].position;
  document.getElementById("candidate-initials").value = index < 0 ? "" : candidates[index].initials;
  document.getElementById("candidate-description").value = index < 0 ? "" : (candidates[index].description || candidates[index].platform || "");
  document.getElementById("candidate-picture").value = "";
  const preview = document.getElementById("picture-preview");
  preview.src = index < 0 ? "" : (candidates[index].picture || "");
  preview.hidden = !(index >= 0 && candidates[index].picture);
  document.getElementById("candidate-modal").hidden = false;
}

function closeCandidateForm() {
  document.getElementById("candidate-modal").hidden = true;
}

async function saveCandidate(event) {
  event.preventDefault();
  const index = Number(document.getElementById("candidate-index").value);
  const existingPicture = index < 0 ? "" : (candidates[index].picture || "");
  const pictureFile = document.getElementById("candidate-picture").files[0];
  const candidate = {
    name: document.getElementById("candidate-name").value.trim(),
    position: document.getElementById("candidate-position").value.trim().toUpperCase(),
    initials: document.getElementById("candidate-initials").value.trim().toUpperCase(),
    description: document.getElementById("candidate-description").value.trim(),
    picture: existingPicture
  };

  const finishSave = async () => {
    saveCandidateHistory();
    const payload = {
      election_id: electionId,
      name: candidate.name,
      position: candidate.position,
      initials: candidate.initials,
      description: candidate.description,
      image_url: candidate.picture || null
    };
    const result = index < 0
      ? await supabaseClient.from("candidates").insert({ ...payload }).select().single()
      : await supabaseClient.from("candidates").update(payload).eq("id", candidates[index].id).select().single();
    if (result.error) { showAdminToast("Candidate could not be saved."); return; }
    if (index < 0) candidates.push({ ...result.data, picture: result.data.image_url || "" });
    else candidates[index] = { ...result.data, picture: result.data.image_url || "" };
    renderCandidates();
    updateResults();
    closeCandidateForm();
    showAdminToast(`${candidate.name} was saved successfully.`);
  };

  if (!pictureFile) {
    finishSave();
    return;
  }

  resizePicture(pictureFile)
    .then(picture => {
      candidate.picture = picture;
      finishSave();
    })
    .catch(() => showAdminToast("The profile picture could not be saved."));
}

function previewCandidatePicture(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("picture-preview");
  if (!file) {
    preview.hidden = true;
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
}

function resizePicture(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Invalid image"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Invalid image"));
      image.onload = () => {
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function deleteCandidate(index) {
  if (!window.confirm(`Delete ${candidates[index].name}?`)) return;
  saveCandidateHistory();
  const removed = candidates[index];
  const { error } = await supabaseClient.from("candidates").delete().eq("id", removed.id);
  if (error) { showAdminToast("Candidate could not be removed."); return; }
  candidates.splice(index, 1);
  renderCandidates();
  updateResults();
  showAdminToast(`${removed.name} was removed.`);
}

function saveCandidateHistory() {
  candidateUndoStack.push(JSON.stringify(candidates));
  candidateRedoStack = [];
  updateHistoryButtons();
}

function restoreCandidateList(nextCandidates) {
  candidates = JSON.parse(nextCandidates);
  renderCandidates();
  updateResults();
  updateHistoryButtons();
}

function undoCandidateChange() {
  if (!candidateUndoStack.length) return;
  candidateRedoStack.push(JSON.stringify(candidates));
  restoreCandidateList(candidateUndoStack.pop());
  showAdminToast("Last candidate change undone.");
}

function redoCandidateChange() {
  if (!candidateRedoStack.length) return;
  candidateUndoStack.push(JSON.stringify(candidates));
  restoreCandidateList(candidateRedoStack.pop());
  showAdminToast("Candidate change restored.");
}

function updateHistoryButtons() {
  document.getElementById("undo-button").disabled = candidateUndoStack.length === 0;
  document.getElementById("redo-button").disabled = candidateRedoStack.length === 0;
}

async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  window.location.replace("index.html");
}

function openAdminProfile() {
  document.getElementById("admin-profile-modal").hidden = false;
}

function closeAdminProfile() {
  document.getElementById("admin-profile-modal").hidden = true;
}

function openElectionSettings() {
  document.getElementById("settings-title").value = election.title;
  document.getElementById("settings-start").value = election.startDate;
  document.getElementById("settings-end").value = election.endDate;
  document.getElementById("settings-deadline").value = election.deadline;
  document.getElementById("settings-voters").value = election.eligibleVoters;
  document.getElementById("election-settings-modal").hidden = false;
}

function closeElectionSettings() {
  document.getElementById("election-settings-modal").hidden = true;
}

async function setActiveElectionPeriod() {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const updates = {
    start_date: toDateInputValue(now),
    end_date: toDateInputValue(end),
    deadline: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    status: "active"
  };
  const { data, error } = await supabaseClient.from("elections").update(updates).eq("id", electionId).select().single();
  if (error) { showAdminToast("Election period could not be updated."); return; }
  election = { ...data, startDate: data.start_date, endDate: data.end_date, eligibleVoters: data.eligible_voters };
  renderElectionSettings();
  showAdminToast("Election is active now and will close after 24 hours.");
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function updateSystemTime() {
  const time = document.getElementById("current-system-time");
  if (time) time.textContent = `Current system time: ${new Date().toLocaleString()}`;
}

async function saveElectionSettings(event) {
  event.preventDefault();
  const startDate = document.getElementById("settings-start").value;
  const endDate = document.getElementById("settings-end").value;

  if (endDate < startDate) {
    showAdminToast("End date must be after the start date.");
    return;
  }

  const updates = {
    title: document.getElementById("settings-title").value.trim(),
    start_date: startDate,
    end_date: endDate,
    deadline: document.getElementById("settings-deadline").value,
    eligible_voters: Number(document.getElementById("settings-voters").value)
  };
  const { data, error } = await supabaseClient.from("elections").update(updates).eq("id", electionId).select().single();
  if (error) { showAdminToast("Election settings could not be updated."); return; }
  election = { ...data, startDate: data.start_date, endDate: data.end_date, eligibleVoters: data.eligible_voters };
  renderElectionSettings();
  closeElectionSettings();
  showAdminToast("Election settings updated successfully.");
}

function renderElectionSettings() {
  document.getElementById("election-title").textContent = election.title;
  document.getElementById("election-period").textContent = `Voting period: ${formatDate(election.startDate)} - ${formatDate(election.endDate)} | ${formatTime(election.deadline)}`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(value) {
  const [hours, minutes] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function showAdminToast(message) {
  const toast = document.getElementById("admin-toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showAdminToast.timer);
  showAdminToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function updateResults() {
  if (!election) return;
  const { data: result, error } = await supabaseClient.rpc("get_admin_results", { requested_election_id: electionId });
  if (error) return;
  const totalVotes = Number(result?.total_votes || 0);
  const eligibleVoters = Number(election.eligibleVoters || 100);
  const turnout = Math.min(100, Math.round((totalVotes / Math.max(eligibleVoters, 1)) * 100));
  const tally = {};

  candidates.forEach(candidate => {
    if (!tally[candidate.position]) tally[candidate.position] = [];
    tally[candidate.position].push({ name: candidate.name, votes: 0 });
  });

  (result?.rows || []).forEach(record => {
    const candidate = tally[record.candidate_position]?.find(item => item.name === record.candidate_name);
    if (candidate) candidate.votes += Number(record.vote_count);
  });

  document.getElementById("total-votes").textContent = totalVotes;
  document.getElementById("turnout-percent").textContent = `${turnout}%`;
  document.getElementById("turnout-bar").style.width = `${turnout}%`;
  document.getElementById("tally-updated").textContent = `Last updated ${new Date().toLocaleTimeString()} | ${eligibleVoters} eligible voters`;

  document.getElementById("results-list").innerHTML = Object.entries(tally).map(([position, entries]) => {
    const positionTotal = entries.reduce((sum, item) => sum + item.votes, 0);
    return `<section class="result-group"><h3>${escapeHtml(position)}</h3>${entries.map(item => {
      const percent = positionTotal ? Math.round((item.votes / positionTotal) * 100) : 0;
      return `<div class="result-row"><div class="result-label"><strong>${escapeHtml(item.name)}</strong><span>${item.votes} vote${item.votes === 1 ? "" : "s"} | ${percent}%</span></div><div class="result-track"><i style="width: ${percent}%"></i></div></div>`;
    }).join("")}</section>`;
  }).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}
