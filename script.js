function resolveUserRole(user) {
  return user?.app_metadata?.role || user?.user_metadata?.role || "voter";
}

function getStoredUserRole() {
  try {
    const storedUser = JSON.parse(localStorage.getItem("elourdesCurrentUser") || "null");
    return storedUser?.role || "voter";
  } catch {
    return "voter";
  }
}

async function login(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const email = emailInput.value.trim().toLowerCase();
  emailInput.value = email;
  const password = passwordInput.value;
  const message = document.getElementById("message");
  const loginButton = document.querySelector("#login-form button[type='submit']");

  message.textContent = "Signing in...";
  message.className = "";
  loginButton.disabled = true;
  let result;
  try {
    result = await supabaseClient.auth.signInWithPassword({ email, password });
  } catch (error) {
    loginButton.disabled = false;
    message.style.color = "red";
    message.textContent = "Unable to reach Supabase. Check your internet connection and GitHub Pages settings.";
    return;
  }
  const { data, error } = result;

  if (error) {
    loginButton.disabled = false;
    message.style.color = "red";
    message.textContent = error.message === "Invalid login credentials"
      ? "Email or password is incorrect. Check both fields or use Forgot Password."
      : error.message;
    return;
  }

  message.className = "success-notice";
  message.style.color = "#0d7d3a";
  message.textContent = "Login successful!";
  const user = data.user;
  const userRole = resolveUserRole(user);
  const isAdmin = userRole === "admin";
  localStorage.setItem("elourdesCurrentUser", JSON.stringify({
    id: user.id,
    name: user.user_metadata?.full_name || user.email,
    username: user.email,
    role: userRole
  }));
  window.setTimeout(() => {
    window.location.href = isAdmin ? "admin.html" : "dashboard.html";
  }, 500);
}

function showSignup(event) {
  event.preventDefault();
  document.querySelector(".container").classList.add("signup-active");
  document.getElementById("login-form").hidden = true;
  document.getElementById("forgot-form").hidden = true;
  document.getElementById("signup-form").hidden = false;
  document.getElementById("signup-guidelines-modal").hidden = true;
}

function showLogin() {
  document.querySelector(".container").classList.remove("signup-active");
  document.getElementById("forgot-form").hidden = true;
  document.getElementById("signup-form").hidden = true;
  document.getElementById("signup-guidelines-modal").hidden = true;
  document.getElementById("new-password-form").hidden = true;
  document.getElementById("login-form").hidden = false;
}

function showRecoveryPasswordForm() {
  document.getElementById("login-form").hidden = true;
  document.getElementById("signup-form").hidden = true;
  document.getElementById("forgot-form").hidden = true;
  document.getElementById("new-password-form").hidden = false;
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input || !button) return;

  const isVisible = input.type === "text";
  input.type = isVisible ? "password" : "text";
  input.focus({ preventScroll: true });
  button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  button.setAttribute("aria-pressed", String(!isVisible));
  const visibleIcon = button.querySelector(".eye-icon-visible");
  const hiddenIcon = button.querySelector(".eye-icon-hidden");
  if (visibleIcon) visibleIcon.hidden = isVisible;
  if (hiddenIcon) hiddenIcon.hidden = !isVisible;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateStudentId(studentId) {
  const normalized = (studentId || "").trim();
  return /^\d{8}$|^\d{4}-\d{4}$/.test(normalized);
}

function getStudentIdFormatMessage() {
  return "Student ID format: enter 8 digits or use YYYY-#### (example: 2024-1234).";
}

function validatePassword(password) {
  const value = (password || "").trim();
  if (value.length < 8) return false;
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  if (!/[^A-Za-z0-9]/.test(value)) return false;
  return true;
}

function forgotPassword(event) {
  event.preventDefault();
  document.getElementById("login-form").hidden = true;
  document.getElementById("signup-form").hidden = true;
  document.getElementById("forgot-form").hidden = false;
  document.getElementById("reset-message").textContent = "";
}

async function resetPassword(event) {
  event.preventDefault();

  const identity = document.getElementById("reset-identity").value.trim();
  const message = document.getElementById("reset-message");

  if (!isValidEmail(identity)) {
    message.style.color = "red";
    message.textContent = "Enter a valid registered email address.";
    return;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(identity, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });

    message.style.color = error ? "red" : "green";
    message.textContent = error
      ? error.message
      : "Check your email for a secure password reset link.";

    if (!error) event.target.reset();
  } catch (error) {
    message.style.color = "red";
    message.textContent = "Unable to send the reset email. Please try again later.";
  }
}

async function applyPasswordRecoverySession() {
  if (!window.isRecoveryUrl || !window.getRecoveryParams) return;
  if (!window.isRecoveryUrl()) return;

  const recoveryParams = window.getRecoveryParams();
  const recoveryMessage = document.getElementById("new-password-message");

  try {
    if (recoveryParams.code) {
      const { error } = await supabaseClient.auth.exchangeCodeForSession(recoveryParams.code);
      if (error) {
        recoveryMessage.style.color = "red";
        recoveryMessage.textContent = error.message;
        return;
      }
    } else if (recoveryParams.accessToken && recoveryParams.refreshToken) {
      const { error } = await supabaseClient.auth.setSession({
        access_token: recoveryParams.accessToken,
        refresh_token: recoveryParams.refreshToken
      });

      if (error) {
        recoveryMessage.style.color = "red";
        recoveryMessage.textContent = error.message;
        return;
      }
    }

    showRecoveryPasswordForm();
  } catch (error) {
    recoveryMessage.style.color = "red";
    recoveryMessage.textContent = "The reset link is invalid or expired. Please request a new one.";
  }
}

async function updatePassword(event) {
  event.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-new-password").value;
  const message = document.getElementById("new-password-message");

  if (newPassword.length < 6) {
    message.style.color = "red";
    message.textContent = "Password must be at least 6 characters long.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
      message.style.color = "red";
      message.textContent = error.message;
      return;
    }

    message.style.color = "green";
    message.textContent = "Password updated successfully. You can now sign in with your new password.";
    event.target.reset();
    window.setTimeout(() => showLogin(), 1800);
  } catch (error) {
    message.style.color = "red";
    message.textContent = "Unable to update password. Please request a new reset link.";
  }
}

async function createAccount(event) {
  event.preventDefault();

  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const message = document.getElementById("signup-message");
  const email = document.getElementById("email").value.trim();
  const studentId = document.getElementById("student-id").value.trim();

  if (!isValidEmail(email)) {
    message.style.color = "red";
    message.textContent = "Use a valid email address. School or personal email is accepted.";
    return;
  }

  if (!validateStudentId(studentId)) {
    message.style.color = "red";
    message.textContent = getStudentIdFormatMessage();
    return;
  }

  if (!validatePassword(password)) {
    message.style.color = "red";
    message.textContent = "Password must be 8+ characters with uppercase, lowercase, number, and special character.";
    return;
  }

  if (password !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  document.getElementById("signup-guidelines-confirm").checked = false;
  document.getElementById("signup-guidelines-error").textContent = "";
  document.getElementById("signup-form").hidden = true;
  document.getElementById("signup-guidelines-modal").hidden = false;
}

function closeSignupGuidelines() {
  document.getElementById("signup-guidelines-modal").hidden = true;
  document.getElementById("signup-form").hidden = false;
}

async function confirmSignupGuidelines() {
  const confirmation = document.getElementById("signup-guidelines-confirm");
  const errorMessage = document.getElementById("signup-guidelines-error");
  if (!confirmation.checked) {
    errorMessage.textContent = "Please confirm that you have read the registration guidelines.";
    return;
  }

  const message = document.getElementById("signup-message");
  const password = document.getElementById("signup-password").value;
  const email = document.getElementById("email").value.trim();
  const studentId = document.getElementById("student-id").value.trim();

  let result;
  try {
    result = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: document.getElementById("full-name").value.trim(),
          student_id: studentId,
          year_level: document.getElementById("year-level").value,
          gender: document.getElementById("gender").value,
          guidelines_accepted: true
        }
      }
    });
  } catch (error) {
    message.style.color = "red";
    message.textContent = "Unable to reach Supabase. Check your internet connection and GitHub Pages settings.";
    return;
  }
  const { data, error } = result;

  if (error) {
    message.style.color = "red";
    message.textContent = error.message;
    return;
  }

  const successMessage = data.session
    ? "Account created successfully! You can sign in and begin voting."
    : "Account created successfully. Check your email to confirm your account before signing in.";

  message.className = "success-notice";
  message.style.color = "#0d7d3a";
  message.textContent = successMessage;
  message.style.padding = "12px 14px";
  message.style.border = "1px solid rgba(13, 125, 58, 0.22)";
  message.style.background = "rgba(18, 181, 90, 0.08)";
  message.style.borderRadius = "8px";
  message.style.display = "block";
  message.style.fontSize = "15px";
  message.style.fontWeight = "700";
  document.getElementById("signup-form").reset();
  closeSignupGuidelines();
  showLogin();
  document.getElementById("message").className = "success-notice";
  document.getElementById("message").style.color = "#0d7d3a";
  document.getElementById("message").textContent = data.session
    ? "Account created successfully. You can now log in."
    : "Account created. Check your email, then log in after confirming it.";
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    applyPasswordRecoverySession();
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    validateStudentId,
    validatePassword,
    getStudentIdFormatMessage,
    isValidEmail
  };
}