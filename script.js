async function login() {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  message.textContent = "Signing in...";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    message.style.color = "red";
    message.textContent = error.message;
    return;
  }

  message.style.color = "green";
  message.textContent = "Login successful!";
  const user = data.user;
  const isAdmin = user.app_metadata?.role === "admin";
  localStorage.setItem("elourdesCurrentUser", JSON.stringify({
    id: user.id,
    name: user.user_metadata?.full_name || user.email,
    username: user.email,
    role: isAdmin ? "admin" : "voter"
  }));
  window.setTimeout(() => {
    window.location.href = isAdmin ? "admin.html" : "dashboard.html";
  }, 500);
}

function showSignup(event) {
  event.preventDefault();
  document.getElementById("login-form").hidden = true;
  document.getElementById("forgot-form").hidden = true;
  document.getElementById("signup-form").hidden = false;
}

function showLogin() {
  document.getElementById("forgot-form").hidden = true;
  document.getElementById("signup-form").hidden = true;
  document.getElementById("login-form").hidden = false;
}

function forgotPassword(event) {
  event.preventDefault();
  document.getElementById("login-form").hidden = true;
  document.getElementById("signup-form").hidden = true;
  document.getElementById("forgot-form").hidden = false;
}

async function resetPassword(event) {
  event.preventDefault();

  const identity = document.getElementById("reset-identity").value.trim();
  const message = document.getElementById("reset-message");

  if (!identity.includes("@")) {
    message.style.color = "red";
    message.textContent = "Enter your registered email address.";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(identity, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });
  message.style.color = error ? "red" : "green";
  message.textContent = error ? error.message : "Check your email for a secure password reset link.";
  if (!error) event.target.reset();
}

async function createAccount(event) {
  event.preventDefault();

  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const message = document.getElementById("signup-message");

  if (password !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  const email = document.getElementById("email").value.trim();
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: document.getElementById("full-name").value.trim(),
        student_id: document.getElementById("student-id").value.trim(),
        year_level: document.getElementById("year-level").value,
        gender: document.getElementById("gender").value
      }
    }
  });

  if (error) {
    message.style.color = "red";
    message.textContent = error.message;
    return;
  }
  message.style.color = "green";
  message.textContent = data.session
    ? "Account created successfully!"
    : "Account created. Check your email to confirm your account.";
  event.target.reset();
}