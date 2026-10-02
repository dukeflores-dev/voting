function getRecoveryParams(url = window.location.href) {
  const parsedUrl = new URL(url);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  return {
    code: queryParams.get('code') || null,
    type: queryParams.get('type') || hashParams.get('type') || null,
    accessToken: hashParams.get('access_token') || null,
    refreshToken: hashParams.get('refresh_token') || null
  };
}

function isRecoveryUrl(url = window.location.href) {
  const { type, code, accessToken, refreshToken } = getRecoveryParams(url);
  return !!(type === 'recovery' || code || (accessToken && refreshToken));
}

if (typeof window !== 'undefined') {
  window.getRecoveryParams = getRecoveryParams;
  window.isRecoveryUrl = isRecoveryUrl;
}

function getPasswordChangeError(newPassword, confirmPassword) {
  if (!newPassword && !confirmPassword) return "";
  if (!newPassword || !confirmPassword) return "Enter and confirm your new password.";
  if (newPassword.length < 6) return "New password must be at least 6 characters long.";
  if (newPassword !== confirmPassword) return "Passwords do not match.";
  return "";
}

export { getRecoveryParams, isRecoveryUrl, getPasswordChangeError };
