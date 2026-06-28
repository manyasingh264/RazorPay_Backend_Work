/**
 * validators.js
 * Client-side form validation functions.
 * All functions return { valid: boolean, error: string }.
 * Pure functions — no DOM interaction.
 */

// -----------------------------------------------------------
// Individual field validators
// -----------------------------------------------------------

/**
 * Validate that a value is not empty/blank.
 * @param {string} value
 * @param {string} [fieldName='This field']
 * @returns {{ valid: boolean, error: string }}
 */
export function required(value, fieldName = 'This field') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate an email address.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateEmail(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, error: 'Email is required.' };
  }
  // RFC 5322-ish pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate that email belongs to the org.com domain.
 * Backend enforces this too, but we show the error early.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateOrgEmail(value) {
  const base = validateEmail(value);
  if (!base.valid) return base;

  const domain = value.trim().toLowerCase().split('@')[1];
  if (domain !== 'org.com') {
    return {
      valid: false,
      error: 'Only @org.com email addresses are allowed.',
    };
  }
  return { valid: true, error: '' };
}

/**
 * Validate password strength.
 * Min 8 chars, at least one number and one letter.
 * @param {string} value
 * @returns {{ valid: boolean, error: string, strength: 'weak'|'medium'|'strong' }}
 */
export function validatePassword(value) {
  if (!value) {
    return { valid: false, error: 'Password is required.', strength: 'weak' };
  }
  if (value.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters.',
      strength: 'weak',
    };
  }

  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: 'Password must contain at least one letter and one number.',
      strength: 'weak',
    };
  }

  const strength = hasSpecial && value.length >= 12 ? 'strong'
    : hasSpecial || value.length >= 10             ? 'medium'
    : 'weak';

  return { valid: true, error: '', strength };
}

/**
 * Validate that two password fields match.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ valid: boolean, error: string }}
 */
export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate a full name (2+ characters, letters and spaces only).
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateName(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { valid: false, error: 'Name is required.' };
  if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters.' };
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes.' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate a positive reimbursement amount.
 * @param {string|number} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateAmount(value) {
  const str = String(value ?? '').trim();
  if (!str) return { valid: false, error: 'Amount is required.' };

  const num = parseFloat(str);
  if (isNaN(num)) return { valid: false, error: 'Amount must be a valid number.' };
  if (num <= 0)   return { valid: false, error: 'Amount must be greater than 0.' };
  if (num > 10000000) return { valid: false, error: 'Amount exceeds the maximum allowed (₹1 Crore).' };

  return { valid: true, error: '' };
}

/**
 * Validate a reimbursement title.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateTitle(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { valid: false, error: 'Title is required.' };
  if (trimmed.length < 3)   return { valid: false, error: 'Title must be at least 3 characters.' };
  if (trimmed.length > 100) return { valid: false, error: 'Title must be under 100 characters.' };
  return { valid: true, error: '' };
}

/**
 * Validate a reimbursement description.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDescription(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { valid: false, error: 'Description is required.' };
  if (trimmed.length < 10)  return { valid: false, error: 'Description must be at least 10 characters.' };
  if (trimmed.length > 500) return { valid: false, error: 'Description must be under 500 characters.' };
  return { valid: true, error: '' };
}

// -----------------------------------------------------------
// Form-level validators (combine field validators)
// -----------------------------------------------------------

/**
 * Validate the login form.
 * @param {{ email: string, password: string }} fields
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateLoginForm({ email, password }) {
  const errors = {};

  const emailResult = validateEmail(email);
  if (!emailResult.valid) errors.email = emailResult.error;

  const passResult = required(password, 'Password');
  if (!passResult.valid) errors.password = passResult.error;

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate the register form.
 * @param {{ name: string, email: string, password: string, confirmPassword: string }} fields
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRegisterForm({ name, email, password, confirmPassword }) {
  const errors = {};

  const nameResult = validateName(name);
  if (!nameResult.valid) errors.name = nameResult.error;

  const emailResult = validateOrgEmail(email);
  if (!emailResult.valid) errors.email = emailResult.error;

  const passResult = validatePassword(password);
  if (!passResult.valid) errors.password = passResult.error;

  const matchResult = validatePasswordMatch(password, confirmPassword);
  if (!matchResult.valid) errors.confirmPassword = matchResult.error;

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate the submit-reimbursement form.
 * @param {{ title: string, description: string, amount: string|number }} fields
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateReimbursementForm({ title, description, amount }) {
  const errors = {};

  const titleResult = validateTitle(title);
  if (!titleResult.valid) errors.title = titleResult.error;

  const descResult = validateDescription(description);
  if (!descResult.valid) errors.description = descResult.error;

  const amountResult = validateAmount(amount);
  if (!amountResult.valid) errors.amount = amountResult.error;

  return { valid: Object.keys(errors).length === 0, errors };
}

// -----------------------------------------------------------
// UI Helper: Show/clear field error
// -----------------------------------------------------------

/**
 * Display an error message below a form field.
 * Looks for a sibling element with class .form-error.
 * @param {string} fieldId    — ID of the input element
 * @param {string} [message]  — error message (empty = clear)
 */
export function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Remove existing error
  const existing = field.parentElement.querySelector('.form-error');
  existing?.remove();
  field.classList.remove('error');

  if (message) {
    field.classList.add('error');
    const err = document.createElement('p');
    err.className = 'form-error';
    err.setAttribute('role', 'alert');
    err.textContent = message;
    field.parentElement.appendChild(err);
  }
}

/**
 * Clear all field errors in a form.
 * @param {string} formId
 */
export function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.form-error').forEach((el) => el.remove());
  form.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

/**
 * Show errors for all fields from a form-level validation result.
 * @param {Record<string, string>} errors
 * @param {string}                 [prefix=''] — field ID prefix
 */
export function showFormErrors(errors, prefix = '') {
  Object.entries(errors).forEach(([field, message]) => {
    showFieldError(`${prefix}${field}`, message);
  });
}
