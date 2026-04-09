/**
 * ui.js
 * Shared UI helpers — error toast, etc.
 */

const toast = document.getElementById('errorToast');
let toastTimer = null;

/**
 * Show an error toast for 4 seconds.
 * @param {string} message
 */
export function showError(message) {
  if (!toast) return;
  toast.textContent = `⚠ ${message}`;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}