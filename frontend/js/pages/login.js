/**
 * login.js
 * Controller for the Login page.
 *
 * Responsibilities:
 *  1. Redirect already-authenticated users to dashboard
 *  2. Handle form submission with validation
 *  3. Show inline field errors and top-level alert
 *  4. Toggle password visibility
 *  5. Persist email in localStorage if "Remember me" is checked
 *  6. On success → redirect to dashboard
 */

import AuthService           from '../services/authService.js';
import Router                from '../utils/router.js';
import { PAGES }             from '../utils/constants.js';
import {
  validateLoginForm,
  showFieldError,
  showFormErrors,
  clearFormErrors,
}                            from '../utils/validators.js';

// -----------------------------------------------------------
// Element references (populated after DOM ready)
// -----------------------------------------------------------
let form, emailInput, passwordInput, submitBtn, alertBox, alertMsg, togglePwdBtn;

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------

async function init() {
  // 1. If already logged in → skip login page
  await Router.guardAuth();

  // 2. Cache DOM references
  form         = document.getElementById('login-form');
  emailInput   = document.getElementById('login-email');
  passwordInput= document.getElementById('login-password');
  submitBtn    = document.getElementById('login-submit-btn');
  alertBox     = document.getElementById('login-alert');
  alertMsg     = document.getElementById('login-alert-msg');
  togglePwdBtn = document.getElementById('toggle-password');

  if (!form) return; // safety guard

  // 3. Pre-fill remembered email
  const remembered = localStorage.getItem('rp_remember_email');
  if (remembered) {
    emailInput.value = remembered;
    document.getElementById('login-remember').checked = true;
  }

  // 4. Wire event listeners
  form.addEventListener('submit', handleSubmit);
  togglePwdBtn?.addEventListener('click', togglePasswordVisibility);

  // Clear field errors on input
  emailInput?.addEventListener('input', () => clearFieldError('login-email'));
  passwordInput?.addEventListener('input', () => clearFieldError('login-password'));

  // Focus the email field on load
  if (!emailInput.value) {
    emailInput.focus();
  } else {
    passwordInput.focus();
  }
}

// -----------------------------------------------------------
// Form submission
// -----------------------------------------------------------

async function handleSubmit(e) {
  e.preventDefault();
  hideAlert();
  clearFormErrors('login-form');

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  // Client-side validation
  const { valid, errors } = validateLoginForm({ email, password });
  if (!valid) {
    showFormErrors(errors, 'login-');
    // Focus first error field
    if (errors.email)    emailInput.focus();
    else if (errors.password) passwordInput.focus();
    return;
  }

  // Show loading state
  setLoading(true);

  try {
    const user = await AuthService.login({ email, password });

    // Handle "Remember me"
    const rememberMe = document.getElementById('login-remember')?.checked;
    if (rememberMe) {
      localStorage.setItem('rp_remember_email', email);
    } else {
      localStorage.removeItem('rp_remember_email');
    }

    // Redirect to dashboard
    window.location.href = PAGES.DASHBOARD;

  } catch (err) {
    setLoading(false);
    showAlert(
      err.status === 401
        ? 'Invalid email or password. Please try again.'
        : err.message || 'Login failed. Please try again.'
    );
    passwordInput.value = '';
    passwordInput.focus();
  }
}

// -----------------------------------------------------------
// Password visibility toggle
// -----------------------------------------------------------

function togglePasswordVisibility() {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePwdBtn.setAttribute('aria-label',
    isPassword ? 'Hide password' : 'Show password'
  );
  togglePwdBtn.textContent = isPassword ? '🙈' : '👁';
  passwordInput.focus();
}

// -----------------------------------------------------------
// UI helpers
// -----------------------------------------------------------

function setLoading(loading) {
  submitBtn.disabled = loading;
  if (loading) {
    submitBtn.classList.add('btn-loading');
    submitBtn.setAttribute('aria-busy', 'true');
  } else {
    submitBtn.classList.remove('btn-loading');
    submitBtn.removeAttribute('aria-busy');
  }
}

function showAlert(message) {
  alertMsg.textContent = message;
  alertBox.classList.remove('hidden');
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  alertBox.classList.add('hidden');
  alertMsg.textContent = '';
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  field?.classList.remove('error');
  field?.parentElement?.querySelector('.form-error')?.remove();
}

// -----------------------------------------------------------
// Boot
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
