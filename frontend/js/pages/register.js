/**
 * register.js
 * Controller for the Register page.
 *
 * Responsibilities:
 *  1. Redirect already-authenticated users to dashboard
 *  2. Validate all fields with inline errors
 *  3. Show real-time password strength indicator
 *  4. Show success message after registration
 *  5. Toggle password visibility
 */

import AuthService           from '../services/authService.js';
import Router                from '../utils/router.js';
import {
  validateRegisterForm,
  validatePassword,
  showFormErrors,
  clearFormErrors,
}                            from '../utils/validators.js';

// -----------------------------------------------------------
// Element references
// -----------------------------------------------------------
let form, nameInput, emailInput, passwordInput, confirmInput,
    submitBtn, alertBox, alertMsg, successBox,
    togglePwdBtn, strengthFill, strengthLabel;

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------

async function init() {
  // Redirect if already authenticated
  await Router.guardAuth();

  // Cache DOM references
  form           = document.getElementById('register-form');
  nameInput      = document.getElementById('register-name');
  emailInput     = document.getElementById('register-email');
  passwordInput  = document.getElementById('register-password');
  confirmInput   = document.getElementById('register-confirm');
  submitBtn      = document.getElementById('register-submit-btn');
  alertBox       = document.getElementById('register-alert');
  alertMsg       = document.getElementById('register-alert-msg');
  successBox     = document.getElementById('register-success');
  togglePwdBtn   = document.getElementById('toggle-reg-password');
  strengthFill   = document.getElementById('password-strength-fill');
  strengthLabel  = document.getElementById('password-strength-label');

  if (!form) return;

  // Wire events
  form.addEventListener('submit', handleSubmit);
  togglePwdBtn?.addEventListener('click', togglePasswordVisibility);

  // Real-time password strength
  passwordInput?.addEventListener('input', updatePasswordStrength);

  // Clear individual field errors on input
  nameInput?.addEventListener('input',    () => clearFieldError('register-name'));
  emailInput?.addEventListener('input',   () => clearFieldError('register-email'));
  confirmInput?.addEventListener('input', () => clearFieldError('register-confirm'));

  nameInput?.focus();
}

// -----------------------------------------------------------
// Form submission
// -----------------------------------------------------------

async function handleSubmit(e) {
  e.preventDefault();
  hideAlert();
  clearFormErrors('register-form');

  const name            = nameInput.value.trim();
  const email           = emailInput.value.trim();
  const password        = passwordInput.value;
  const confirmPassword = confirmInput.value;

  // Validate
  const { valid, errors } = validateRegisterForm({ name, email, password, confirmPassword });
  if (!valid) {
    showFormErrors(errors, 'register-');
    // Focus first error
    const firstErrorField = ['name', 'email', 'password', 'confirm'].find(
      (f) => errors[f] || errors[f === 'confirm' ? 'confirmPassword' : f]
    );
    if (firstErrorField) {
      document.getElementById(`register-${firstErrorField}`)?.focus();
    }
    return;
  }

  setLoading(true);

  try {
    await AuthService.register({ name, email, password });

    // Show success — don't auto-login (role must be assigned by CFO first)
    form.reset();
    strengthFill.className   = 'password-strength-fill';
    strengthLabel.textContent = '';
    showSuccess();
    submitBtn.textContent = 'Account created ✓';

  } catch (err) {
    setLoading(false);

    // Common backend error messages
    let message = err.message || 'Registration failed. Please try again.';
    if (message.toLowerCase().includes('already')) {
      message = 'An account with this email already exists. Please sign in.';
    }
    showAlert(message);
  }
}

// -----------------------------------------------------------
// Real-time password strength indicator
// -----------------------------------------------------------

function updatePasswordStrength() {
  const value = passwordInput.value;

  if (!value) {
    strengthFill.className    = 'password-strength-fill';
    strengthLabel.textContent = '';
    return;
  }

  const result = validatePassword(value);
  const strength = result.strength || 'weak';

  // Update fill bar class
  strengthFill.className = `password-strength-fill ${strength}`;

  // Update label text and color
  const labels = {
    weak:   '⚠ Weak password',
    medium: '~ Medium password',
    strong: '✓ Strong password',
  };
  strengthLabel.textContent = labels[strength] || '';
  strengthLabel.style.color = {
    weak:   'var(--color-danger)',
    medium: 'var(--color-warning)',
    strong: 'var(--color-success)',
  }[strength] || '';
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

function showSuccess() {
  successBox.classList.remove('hidden');
  successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // Disable form so user doesn't re-submit
  form.querySelectorAll('input, button').forEach((el) => {
    el.disabled = true;
  });
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
