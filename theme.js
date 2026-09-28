const themePreferenceKey = "elourdesTheme";
const themePageSelector = ".admin-account, .account-area";

function getThemePreference() {
  try {
    return localStorage.getItem(themePreferenceKey) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme, persist = true) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  if (persist) {
    try {
      localStorage.setItem(themePreferenceKey, nextTheme);
    } catch {}
  }

  const button = document.querySelector(".theme-toggle");
  if (button) {
    const nextLabel = nextTheme === "dark" ? "light mode" : "dark mode";
    button.innerHTML = nextTheme === "dark"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>';
    button.setAttribute("aria-label", `Switch to ${nextLabel}`);
    button.title = `Switch to ${nextLabel}`;
    button.setAttribute("aria-pressed", String(nextTheme === "dark"));
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

const themeEnabledOnPage = /(?:admin|dashboard)\.html$/i.test(window.location.pathname);
document.documentElement.dataset.theme = themeEnabledOnPage ? getThemePreference() : "light";
document.documentElement.style.colorScheme = document.documentElement.dataset.theme;

document.addEventListener("DOMContentLoaded", () => {
  const accountActions = document.querySelector(themePageSelector);
  if (!accountActions) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>';
  button.addEventListener("click", toggleTheme);
  accountActions.prepend(button);
  applyTheme(document.documentElement.dataset.theme);
});