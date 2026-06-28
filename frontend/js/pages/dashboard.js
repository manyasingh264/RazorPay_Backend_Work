/**
 * dashboard.js
 * Role-aware dashboard page controller.
 *
 * Renders different dashboards based on role:
 *  EMP → own stats + recent reimbursements + quick submit
 *  RM  → pending approvals count + team list + pending table
 *  APE → reimbursements pending APE approval + stats
 *  CFO → everything: all stats, all employees, all reimbursements
 */

import Router                  from '../utils/router.js';
import Sidebar                 from '../components/sidebar.js';
import Navbar                  from '../components/navbar.js';
import Loader                  from '../components/loader.js';
import Toast                   from '../components/toast.js';
import { ROLES, PAGES }        from '../utils/constants.js';
import { getEmployees }        from '../api/employee.js';
import ReimbursementService    from '../services/reimbursementService.js';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  roleBadge,
  getInitials,
  escapeHTML,
}                              from '../utils/helpers.js';

// -----------------------------------------------------------
// Page state
// -----------------------------------------------------------
let currentUser = null;

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------
async function init() {
  // 1. Auth guard — redirects if not logged in / wrong role
  currentUser = await Router.guard();

  // 2. Render chrome (sidebar + navbar)
  Sidebar.render({ user: currentUser });
  Navbar.render({ title: 'Dashboard', user: currentUser });

  // 3. Render role-specific dashboard
  const content = document.getElementById('dashboard-content');
  Loader.showInline(content, 'Loading dashboard…');

  try {
    switch (currentUser.role) {
      case ROLES.EMP: await renderEmpDashboard(content);  break;
      case ROLES.RM:  await renderRmDashboard(content);   break;
      case ROLES.APE: await renderApeDashboard(content);  break;
      case ROLES.CFO: await renderCfoDashboard(content);  break;
      default:        renderUnknownRole(content);
    }
  } catch (err) {
    content.innerHTML = errorState(err.message);
    Toast.error('Failed to load dashboard', err.message);
  }
}

// ============================================================
// EMPLOYEE DASHBOARD
// ============================================================
async function renderEmpDashboard(container) {
  const reimbursements = await ReimbursementService.getAll();
  const stats          = ReimbursementService.computeStats(reimbursements);
  const recent         = ReimbursementService.getRecent(reimbursements, 5);

  container.innerHTML = `
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Good ${greeting()}, ${escapeHTML(firstName(currentUser.name))} 👋</h2>
        <p class="page-subtitle">Here's a summary of your reimbursements</p>
      </div>
      <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-primary">
        + Submit Request
      </a>
    </div>

    <!-- Stat Cards -->
    <div class="stats-grid" id="emp-stats">
      ${statCard({ icon: '📄', iconClass: 'blue',   label: 'Total Requests', value: stats.total,    sub: 'All time' })}
      ${statCard({ icon: '⏳', iconClass: 'yellow',  label: 'Pending',        value: stats.pending,  sub: 'Awaiting approval' })}
      ${statCard({ icon: '✅', iconClass: 'green',  label: 'Approved',       value: stats.approved, sub: formatCurrency(stats.approvedAmount) })}
      ${statCard({ icon: '❌', iconClass: 'red',    label: 'Rejected',       value: stats.rejected, sub: 'Requests declined' })}
    </div>

    <!-- Recent Reimbursements -->
    <div class="card section">
      <div class="card-header">
        <div>
          <h3 class="card-title">Recent Reimbursements</h3>
          <p class="card-subtitle">Your last ${recent.length} requests</p>
        </div>
        <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-secondary btn-sm">View all →</a>
      </div>
      ${recentReimbursementsTable(recent)}
    </div>

    <!-- Empty state if no requests yet -->
    ${reimbursements.length === 0 ? empEmptyState() : ''}
  `;
}

// ============================================================
// RM DASHBOARD
// ============================================================
async function renderRmDashboard(container) {
  const [reimbursements, employeesRes] = await Promise.all([
    ReimbursementService.getAll(),
    getEmployees(),
  ]);

  const employees = employeesRes?.data?.users || [];
  const stats     = ReimbursementService.computeStats(reimbursements);
  const pending   = reimbursements.filter((r) => r.status === 'PENDING');

  // Set pending badge on sidebar
  Sidebar.setBadge('nav-reimbursements', pending.length);

  container.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Manager Dashboard</h2>
        <p class="page-subtitle">Manage your team's reimbursements</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      ${statCard({ icon: '👥', iconClass: 'blue',   label: 'My Team',           value: employees.length, sub: 'Assigned employees' })}
      ${statCard({ icon: '⏳', iconClass: 'yellow',  label: 'Pending Approvals', value: stats.pending,    sub: 'Awaiting your review' })}
      ${statCard({ icon: '✅', iconClass: 'green',  label: 'Approved',          value: stats.approved,   sub: formatCurrency(stats.approvedAmount) })}
      ${statCard({ icon: '❌', iconClass: 'red',    label: 'Rejected',          value: stats.rejected,   sub: 'This period' })}
    </div>

    <div class="content-grid">
      <!-- Pending Requests -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Pending Approvals</h3>
            <p class="card-subtitle">${pending.length} request${pending.length !== 1 ? 's' : ''} need your review</p>
          </div>
          <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-primary btn-sm">Review all</a>
        </div>
        ${recentReimbursementsTable(pending.slice(0, 5), true)}
      </div>

      <!-- Team Members -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">My Team</h3>
            <p class="card-subtitle">${employees.length} employee${employees.length !== 1 ? 's' : ''} assigned</p>
          </div>
          <a href="${PAGES.EMPLOYEES}" class="btn btn-secondary btn-sm">View all</a>
        </div>
        ${teamMiniList(employees.slice(0, 6))}
      </div>
    </div>
  `;
}

// ============================================================
// APE DASHBOARD
// ============================================================
async function renderApeDashboard(container) {
  const reimbursements = await ReimbursementService.getAll();
  const stats          = ReimbursementService.computeStats(reimbursements);

  // Set badge on sidebar
  Sidebar.setBadge('nav-reimbursements', reimbursements.length);

  container.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">APE Dashboard</h2>
        <p class="page-subtitle">Reimbursements awaiting your approval</p>
      </div>
      <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-primary">Review Approvals</a>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      ${statCard({ icon: '📋', iconClass: 'blue',   label: 'Pending Review',   value: reimbursements.length, sub: 'RM approved, awaiting APE' })}
      ${statCard({ icon: '✅', iconClass: 'green',  label: 'Approved by You',  value: stats.approved,        sub: formatCurrency(stats.approvedAmount) })}
      ${statCard({ icon: '❌', iconClass: 'red',    label: 'Rejected',         value: stats.rejected,        sub: 'Requests declined' })}
      ${statCard({ icon: '💰', iconClass: 'purple', label: 'Total Value',      value: formatCurrencyShort(stats.totalAmount), sub: 'All requests combined' })}
    </div>

    <!-- Pending approvals table -->
    <div class="card section">
      <div class="card-header">
        <div>
          <h3 class="card-title">Pending Approvals</h3>
          <p class="card-subtitle">These have been approved by their Reporting Manager</p>
        </div>
        <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-primary btn-sm">Open full list →</a>
      </div>
      ${recentReimbursementsTable(reimbursements.slice(0, 8), true)}
    </div>
  `;
}

// ============================================================
// CFO DASHBOARD
// ============================================================
async function renderCfoDashboard(container) {
  const [reimbursements, employeesRes] = await Promise.all([
    ReimbursementService.getAll(),
    getEmployees(),
  ]);

  const employees = employeesRes?.data?.users || [];
  const stats     = ReimbursementService.computeStats(reimbursements);

  // Breakdown by role
  const empCount = employees.filter((u) => u.role === ROLES.EMP).length;
  const rmCount  = employees.filter((u) => u.role === ROLES.RM).length;
  const apeCount = employees.filter((u) => u.role === ROLES.APE).length;

  container.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">CFO Dashboard</h2>
        <p class="page-subtitle">Complete overview of all reimbursements and staff</p>
      </div>
      <div class="flex gap-2">
        <a href="${PAGES.EMPLOYEES}" class="btn btn-secondary">Manage Employees</a>
        <a href="${PAGES.ROLES}" class="btn btn-primary">Assign Roles</a>
      </div>
    </div>

    <!-- KPI Cards Row 1: Reimbursements -->
    <div class="section-header">
      <h3 class="section-title">Reimbursements</h3>
    </div>
    <div class="stats-grid" style="margin-bottom:var(--space-6)">
      ${statCard({ icon: '📄', iconClass: 'blue',   label: 'Total Requests',   value: stats.total,    sub: formatCurrency(stats.totalAmount) })}
      ${statCard({ icon: '⏳', iconClass: 'yellow',  label: 'Pending Final',    value: stats.pending,  sub: 'Awaiting CFO approval' })}
      ${statCard({ icon: '✅', iconClass: 'green',  label: 'Approved',         value: stats.approved, sub: formatCurrency(stats.approvedAmount) })}
      ${statCard({ icon: '❌', iconClass: 'red',    label: 'Rejected',         value: stats.rejected, sub: 'Total declined' })}
    </div>

    <!-- KPI Cards Row 2: Organisation -->
    <div class="section-header">
      <h3 class="section-title">Organisation</h3>
    </div>
    <div class="stats-grid" style="margin-bottom:var(--space-8)">
      ${statCard({ icon: '👤', iconClass: 'blue',   label: 'Employees',  value: empCount, sub: 'Role: EMP' })}
      ${statCard({ icon: '👔', iconClass: 'purple', label: 'Managers',   value: rmCount,  sub: 'Role: RM'  })}
      ${statCard({ icon: '💼', iconClass: 'yellow',  label: 'APEs',       value: apeCount, sub: 'Role: APE' })}
      ${statCard({ icon: '👥', iconClass: 'green',  label: 'Total Staff', value: employees.length, sub: 'All roles combined' })}
    </div>

    <div class="content-grid">
      <!-- Recent Reimbursements -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Recent Activity</h3>
            <p class="card-subtitle">Latest reimbursements across all employees</p>
          </div>
          <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-secondary btn-sm">View all →</a>
        </div>
        ${recentReimbursementsTable(ReimbursementService.getRecent(reimbursements, 5), true)}
      </div>

      <!-- Staff Overview -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Staff Overview</h3>
            <p class="card-subtitle">${employees.length} total members in the org</p>
          </div>
          <a href="${PAGES.EMPLOYEES}" class="btn btn-secondary btn-sm">Manage →</a>
        </div>
        ${teamMiniList(employees.slice(0, 6))}
      </div>
    </div>
  `;
}

// ============================================================
// Shared rendering helpers
// ============================================================

/**
 * Generate a stat card HTML string.
 */
function statCard({ icon, iconClass, label, value, sub }) {
  return `
    <div class="stat-card">
      <div class="stat-card-icon ${iconClass}" aria-hidden="true">${icon}</div>
      <div class="stat-card-label">${escapeHTML(label)}</div>
      <div class="stat-card-value">${escapeHTML(String(value ?? 0))}</div>
      ${sub ? `<div class="stat-card-sub">${escapeHTML(String(sub))}</div>` : ''}
    </div>
  `;
}

/**
 * Render a mini reimbursements table (last N rows).
 * @param {Array}   rows
 * @param {boolean} [showEmployee=false] — show employee name column
 */
function recentReimbursementsTable(rows, showEmployee = false) {
  if (!rows || rows.length === 0) {
    return `
      <div class="table-empty">
        <div class="table-empty-icon">📭</div>
        <div class="table-empty-title">No reimbursements yet</div>
        <div class="table-empty-desc">Nothing to show here right now.</div>
      </div>
    `;
  }

  const empCol = showEmployee
    ? `<th>Employee</th>`
    : '';

  const rows_html = rows.map((r) => `
    <tr>
      ${showEmployee ? `<td><span class="text-sm font-medium">${escapeHTML(r.employeeName || r.name || '—')}</span></td>` : ''}
      <td class="truncate" style="max-width:160px" title="${escapeHTML(r.title || '')}">
        ${escapeHTML(r.title || '—')}
      </td>
      <td class="table-amount">${formatCurrency(r.amount)}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-sm text-muted">${formatDate(r.createdAt)}</td>
    </tr>
  `).join('');

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            ${empCol}
            <th>Title</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows_html}</tbody>
      </table>
    </div>
  `;
}

/**
 * Mini team member list (avatars + names).
 */
function teamMiniList(users) {
  if (!users || users.length === 0) {
    return `
      <div class="table-empty">
        <div class="table-empty-icon">👥</div>
        <div class="table-empty-title">No team members yet</div>
        <div class="table-empty-desc">Ask your CFO to assign employees.</div>
      </div>
    `;
  }

  return `
    <div style="padding: var(--space-2) 0;">
      ${users.map((u) => `
        <div style="
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-6);
          border-bottom: 1px solid var(--color-gray-100);
          transition: background var(--transition-fast);
        " class="cursor-pointer" onmouseenter="this.style.background='var(--color-gray-50)'" onmouseleave="this.style.background=''">
          <div class="avatar avatar-sm">${getInitials(u.name)}</div>
          <div style="flex:1; min-width:0;">
            <div class="text-sm font-medium truncate">${escapeHTML(u.name || '—')}</div>
            <div class="text-xs text-muted truncate">${escapeHTML(u.email || '')}</div>
          </div>
          ${roleBadge(u.role)}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * EMP empty state (first time, no requests yet).
 */
function empEmptyState() {
  return `
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3 class="empty-state-title">No reimbursements yet</h3>
          <p class="empty-state-desc">
            Submit your first reimbursement request and track its approval status here.
          </p>
          <a href="${PAGES.REIMBURSEMENTS}" class="btn btn-primary" style="margin-top: var(--space-6);">
            + Submit your first request
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderUnknownRole(container) {
  container.innerHTML = `
    <div class="empty-state" style="min-height: 60vh;">
      <div class="empty-state-icon">🔑</div>
      <h2 class="empty-state-title">No role assigned</h2>
      <p class="empty-state-desc">
        Your account exists but no role has been assigned yet.<br/>
        Please contact your CFO to get a role assigned.
      </p>
    </div>
  `;
}

function errorState(message) {
  return `
    <div class="empty-state" style="min-height:60vh;">
      <div class="empty-state-icon">⚠️</div>
      <h2 class="empty-state-title">Failed to load dashboard</h2>
      <p class="empty-state-desc">${escapeHTML(message)}</p>
      <button class="btn btn-primary" onclick="location.reload()" style="margin-top:var(--space-6);">
        Try again
      </button>
    </div>
  `;
}

// -----------------------------------------------------------
// Utility helpers
// -----------------------------------------------------------

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function firstName(name) {
  return (name || 'there').split(' ')[0];
}

function formatCurrencyShort(amount) {
  const num = Number(amount || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

// -----------------------------------------------------------
// Boot
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
