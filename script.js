function resolveUserRole(user) {
  return user?.app_metadata?.role || "voter";
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
  let inputValue = emailInput.value.trim().toLowerCase();
  const identity = getLoginIdentity(inputValue);
  if (!identity) {
    const message = document.getElementById("message");
    message.style.color = "red";
    message.textContent = getStudentIdFormatMessage();
    return;
  }
  emailInput.value = inputValue;
  const password = passwordInput.value;
  const message = document.getElementById("message");
  const loginButton = document.querySelector("#login-form button[type='submit']");

  message.textContent = "Signing in...";
  message.className = "";
  loginButton.disabled = true;
  let result;
  try {
    if (identity.type === "student_id") {
      const { data: loginData, error: loginError } = await supabaseClient.functions.invoke(
        "login-with-student-id",
        { body: { studentId: identity.value, password } }
      );
      if (loginError || !loginData?.access_token || !loginData?.refresh_token) {
        loginButton.disabled = false;
        message.style.color = "red";
        message.textContent = "Student ID or password is incorrect.";
        return;
      }
      result = await supabaseClient.auth.setSession({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token
      });
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email: identity.value, password });
    }
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
      ? "Student ID or password is incorrect."
      : error.message;
    return;
  }

  const user = data.user;
  const userRole = resolveUserRole(user);
  const isAdmin = userRole === "admin";
  if (!isAdmin) {
    const studentIdMatches = matchesLoginStudentId(user, inputValue);
    if (!studentIdMatches) {
      try {
        await supabaseClient.auth.signOut();
      } catch (error) {
        console.error("Unable to clear the session after failed identity verification.", error);
      }
      loginButton.disabled = false;
      message.style.color = "red";
      message.textContent = "Student ID does not match the registered account.";
      return;
    }
  }

  localStorage.setItem("elourdesCurrentUser", JSON.stringify({
    id: user.id,
    name: user.user_metadata?.full_name || user.email,
    username: user.email,
    role: userRole
  }));
  window.location.href = isAdmin ? "admin.html" : "dashboard.html";
}

function showLogin() {
  document.getElementById("new-password-form").hidden = true;
  document.getElementById("login-form").hidden = false;
}

function updateLoginPasswordField() {
  const identity = getLoginIdentity(document.getElementById("username").value);
  const passwordInput = document.getElementById("password");
  const needsPassword = Boolean(identity);

  passwordInput.required = needsPassword;
  if (!needsPassword) passwordInput.value = "";
}

function showRecoveryPasswordForm() {
  document.getElementById("login-form").hidden = true;
  document.getElementById("new-password-form").hidden = false;

  document.getElementById("admin-password-reset-fields").hidden = false;
  document.getElementById("recovery-password-help").textContent = "Choose a new password for your account (at least 6 characters).";
  document.getElementById("new-password-submit").textContent = "UPDATE PASSWORD";
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

function normalizeStudentId(studentId) {
  return String(studentId || "").replace(/\D/g, "");
}

function getLoginIdentity(identity) {
  const value = String(identity || "").trim().toLowerCase();
  if (validateStudentId(value)) return { type: "student_id", value };
  if (isValidEmail(value)) return { type: "email", value };
  return null;
}

function matchesLoginStudentId(user, identity) {
  const registeredStudentId = user?.user_metadata?.student_id;
  return validateStudentId(identity) && Boolean(registeredStudentId) &&
    normalizeStudentId(identity) === normalizeStudentId(registeredStudentId);
}

function getStudentIdFormatMessage() {
  return "Student ID format: enter 8 digits or use YYYY-#### (example: 2024-1234).";
}

function getRegistrationPassword(studentId) {
  return String(studentId || "").trim();
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

    await showRecoveryPasswordForm();
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

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    applyPasswordRecoverySession();
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    resolveUserRole,
    validateStudentId,
    normalizeStudentId,
    getLoginIdentity,
    matchesLoginStudentId,
    getStudentIdFormatMessage,
    isValidEmail
  };
}