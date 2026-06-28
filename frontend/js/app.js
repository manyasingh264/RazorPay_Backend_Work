/**
 * app.js
 * Main entry point for the frontend application.
 *
 * This file is intentionally minimal.
 * Each page (login.js, dashboard.js, etc.) is a self-contained
 * ES module that bootstraps itself via DOMContentLoaded.
 *
 * app.js is only needed if you want a single-file SPA router.
 * Since we use separate .html pages, it acts as a shared init
 * for any global behavior.
 */

// Global unhandled error boundary — catches uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Unhandled Promise Rejection:', event.reason);
  // Prevent the browser from logging a red error for expected 401s
  if (event.reason?.status === 401) {
    event.preventDefault(); // handled by router
  }
});

// Global error handler (syntax errors, script load failures)
window.addEventListener('error', (event) => {
  console.error('[App] Uncaught Error:', event.error || event.message);
});

console.log('[ReimburseApp] Initialized');
