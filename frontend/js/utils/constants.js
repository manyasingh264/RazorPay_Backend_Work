/**
 * constants.js
 * Single source of truth for:
 *  - API base URL
 *  - Role names
 *  - Page routes
 *  - Reimbursement status enums
 */

// -----------------------------------------------------------
// API Base URL — environment-aware
//
// In production (deployed on Render):
//   The frontend is served from https://reimburse-frontend.onrender.com
//   and the backend from https://razorpay-backend-work.onrender.com
//
// In local development:
//   Frontend served via `npx serve ./frontend --listen 3000`
//   Backend running on localhost:7002
//
// To switch: just change PROD_BACKEND_URL below.
// -----------------------------------------------------------
const PROD_BACKEND_URL = 'https://razorpay-backend-work.onrender.com';
const DEV_BACKEND_URL  = 'http://localhost:7002';

export const API_BASE_URL = window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1'
  ? DEV_BACKEND_URL
  : PROD_BACKEND_URL;

// -----------------------------------------------------------
// User Roles (must match backend exactly)
// -----------------------------------------------------------
export const ROLES = Object.freeze({
  EMP: 'EMP',
  RM:  'RM',
  APE: 'APE',
  CFO: 'CFO',
});

// -----------------------------------------------------------
// Reimbursement Status Enums (must match backend exactly)
// -----------------------------------------------------------
export const STATUS = Object.freeze({
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

// -----------------------------------------------------------
// Frontend Page Routes (relative to /pages/ directory)
// -----------------------------------------------------------
export const PAGES = Object.freeze({
  LOGIN:          '../pages/login.html',
  REGISTER:       '../pages/register.html',
  DASHBOARD:      '../pages/dashboard.html',
  REIMBURSEMENTS: '../pages/reimbursements.html',
  EMPLOYEES:      '../pages/employees.html',
  ROLES:          '../pages/roles.html',
});

// -----------------------------------------------------------
// Session Storage Key (stores minimal non-sensitive user info)
// Role and name are NOT sensitive — the real auth is cookie-based.
// We use sessionStorage only to avoid extra /me calls.
// -----------------------------------------------------------
export const SESSION_KEY = 'rp_user';

// -----------------------------------------------------------
// Role display labels (human-readable)
// -----------------------------------------------------------
export const ROLE_LABELS = Object.freeze({
  [ROLES.EMP]: 'Employee',
  [ROLES.RM]:  'Reporting Manager',
  [ROLES.APE]: 'Accounts Payable Executive',
  [ROLES.CFO]: 'Chief Financial Officer',
});

// -----------------------------------------------------------
// Pages each role is ALLOWED to access
// -----------------------------------------------------------
export const ROLE_ALLOWED_PAGES = Object.freeze({
  [ROLES.EMP]: [PAGES.DASHBOARD, PAGES.REIMBURSEMENTS],
  [ROLES.RM]:  [PAGES.DASHBOARD, PAGES.EMPLOYEES, PAGES.REIMBURSEMENTS],
  [ROLES.APE]: [PAGES.DASHBOARD, PAGES.REIMBURSEMENTS],
  [ROLES.CFO]: [PAGES.DASHBOARD, PAGES.EMPLOYEES, PAGES.ROLES, PAGES.REIMBURSEMENTS],
});

// -----------------------------------------------------------
// Pagination default
// -----------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 10;
