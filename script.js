function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  const message = document.getElementById("message");
  const savedAccount = JSON.parse(localStorage.getItem("elourdesAccount") || "null");
  const isAdmin = user === "admin" && pass === "1234";
  const isRegisteredUser = savedAccount &&
    (user === savedAccount.studentId || user === savedAccount.email) &&
    pass === savedAccount.password;

  if (isAdmin || isRegisteredUser) {
    message.style.color = "green";
    message.textContent = "Login successful!";
    localStorage.setItem("elourdesCurrentUser", JSON.stringify({
      name: isAdmin ? "Administrator" : savedAccount.fullName,
      username: user
    }));

    setTimeout(() => {
      window.location.href = isAdmin ? "admin.html" : "dashboard.html";
    }, 500);

  } else {
    message.style.color = "red";
    message.textContent = "Invalid username or password";
  }
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

function resetPassword(event) {
  event.preventDefault();

  const account = JSON.parse(localStorage.getItem("elourdesAccount") || "null");
  const identity = document.getElementById("reset-identity").value.trim();
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-new-password").value;
  const message = document.getElementById("reset-message");

  if (!account || (identity !== account.studentId && identity !== account.email)) {
    message.style.color = "red";
    message.textContent = "Student ID or email was not found.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  account.password = newPassword;
  localStorage.setItem("elourdesAccount", JSON.stringify(account));
  message.style.color = "green";
  message.textContent = "Password updated. You can now log in.";
  event.target.reset();
}

function createAccount(event) {
  event.preventDefault();

  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const message = document.getElementById("signup-message");

  if (password !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  localStorage.setItem("elourdesAccount", JSON.stringify({
    fullName: document.getElementById("full-name").value,
    studentId: document.getElementById("student-id").value,
    email: document.getElementById("email").value,
    password
  }));

  message.style.color = "green";
  message.textContent = "Account created successfully!";
}