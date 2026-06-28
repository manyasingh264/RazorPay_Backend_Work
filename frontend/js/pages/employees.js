/**
 * employees.js
 * Role-aware Employee Management page controller.
 *
 * CFO  → Full employee table + Assign EMP→RM + Remove assignment
 * RM   → Read-only view of their assigned team + reimbursement drill-down
 * APE  → Read-only list of all employees and managers
 */

import Router              from '../utils/router.js';
import Sidebar             from '../components/sidebar.js';
import Navbar              from '../components/navbar.js';
import Modal               from '../components/modal.js';
import Toast               from '../components/toast.js';
import Loader              from '../components/loader.js';
import DataTable           from '../components/table.js';
import { ROLES }           from '../utils/constants.js';
import { getEmployees, assignEmployee, removeAssignment } from '../api/employee.js';
import { getUserReimbursements } from '../api/reimbursement.js';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  roleBadge,
  escapeHTML,
  getInitials,
}                          from '../utils/helpers.js';

// -----------------------------------------------------------
// Page state
// -----------------------------------------------------------
let currentUser = null;
let dataTable   = null;
let allUsers    = [];    // full employee list from API

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------
async function init() {
  currentUser = await Router.guard();

  Sidebar.render({ user: currentUser });
  Navbar.render({ title: 'Employees', user: currentUser });

  const content = document.getElementById('page-content');
  Loader.showInline(content, 'Loading employees…');

  try {
    switch (currentUser.role) {
      case ROLES.CFO: await renderCfoPage(content); break;
      case ROLES.RM:  await renderRmPage(content);  break;
      case ROLES.APE: await renderApePage(content); break;
      default:
        // EMP should never reach this page (router blocks it)
        Router.to403(currentUser.role);
    }
  } catch (err) {
    content.innerHTML = errorState(err.message);
    Toast.error('Error loading employees', err.message);
  }
}

// ============================================================
// CFO — Full management view
// ============================================================
async function renderCfoPage(container) {
  const response = await getEmployees();
  allUsers = response?.data?.users || [];

  const empCount = allUsers.filter((u) => u.role === ROLES.EMP).length;
  const rmCount  = allUsers.filter((u) => u.role === ROLES.RM).length;
  const apeCount = allUsers.filter((u) => u.role === ROLES.APE).length;

  container.innerHTML = `
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Employee Management</h2>
        <p class="page-subtitle">View all staff, assign employees to managers, and manage team structure</p>
      </div>
      <button class="btn btn-primary" id="btn-assign-emp">
        + Assign Employee
      </button>
    </div>

    <!-- Stats Strip -->
    <div class="stats-grid" style="margin-bottom: var(--space-6);">
      ${cfoCfgStat('👤', 'Employees', empCount,  'blue')}
      ${cfoCfgStat('👔', 'Managers',  rmCount,   'purple')}
      ${cfoCfgStat('💼', 'APEs',      apeCount,  'yellow')}
      ${cfoCfgStat('👥', 'Total Staff', allUsers.length, 'green')}
    </div>

    <!-- Employee Table Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">All Staff</h3>
          <p class="card-subtitle">${allUsers.length} registered users</p>
        </div>
      </div>
      <div id="cfo-employee-table"></div>
    </div>
  `;

  // Build DataTable
  dataTable = new DataTable({
    containerId:  'cfo-employee-table',
    pageSize:     12,
    searchable:   true,
    emptyTitle:   'No employees found',
    emptyDesc:    'Try adjusting your search or filter.',
    columns: [
      {
        key:      'name',
        label:    'Employee',
        sortable: true,
        render:   (val, row) => `
          <div class="table-user-cell">
            <div class="avatar avatar-sm">${getInitials(val)}</div>
            <div>
              <div class="table-user-name">${escapeHTML(val || '—')}</div>
              <div class="table-user-email">${escapeHTML(row.email || '')}</div>
            </div>
          </div>
        `,
      },
      {
        key:      'role',
        label:    'Role',
        sortable: true,
        render:   (val) => roleBadge(val),
      },
      {
        key:      'rmName',
        label:    'Reporting Manager',
        sortable: true,
        render:   (val, row) => {
          if (row.role !== ROLES.EMP) return `<span class="text-xs text-muted">N/A</span>`;
          if (!val && !row.rmId)      return `<span class="badge badge-pending">Unassigned</span>`;
          return `
            <div class="table-user-cell">
              <div class="avatar avatar-sm" style="background:var(--color-purple,#7c3aed)">${getInitials(val)}</div>
              <span class="text-sm">${escapeHTML(val || row.rmId || '—')}</span>
            </div>
          `;
        },
      },
      {
        key:      'userId',
        label:    'Actions',
        sortable: false,
        render:   (val, row) => buildCfoActions(row),
      },
    ],
  });

  // Add role filter to toolbar
  dataTable.setData(allUsers);

  const toolbarRight = dataTable.getToolbarRight();
  if (toolbarRight) {
    toolbarRight.innerHTML = `
      <select class="filter-select" id="role-filter" aria-label="Filter by role">
        <option value="">All roles</option>
        <option value="EMP">Employees (EMP)</option>
        <option value="RM">Managers (RM)</option>
        <option value="APE">APE</option>
      </select>
    `;
    document.getElementById('role-filter')?.addEventListener('change', (e) => {
      const filtered = e.target.value
        ? allUsers.filter((u) => u.role === e.target.value)
        : allUsers;
      dataTable.setData(filtered);
    });
  }

  // Delegate action button clicks (assign/remove)
  document.getElementById('cfo-employee-table')
    ?.addEventListener('click', handleCfoTableClick);

  // "Assign Employee" button opens the assign modal
  document.getElementById('btn-assign-emp')
    ?.addEventListener('click', () => openAssignModal());
}

/**
 * Build the action buttons for a CFO table row.
 */
function buildCfoActions(row) {
  const buttons = [];

  // Show "Remove Assignment" only if EMP has an assigned RM
  if (row.role === ROLES.EMP && row.rmId) {
    buttons.push(`
      <button
        class="btn btn-danger btn-sm"
        data-action="remove"
        data-emp-id="${escapeHTML(row.userId || row.id)}"
        data-rm-id="${escapeHTML(row.rmId)}"
        data-emp-name="${escapeHTML(row.name || '')}"
        aria-label="Remove manager assignment for ${escapeHTML(row.name || '')}"
      >Remove RM</button>
    `);
  }

  // Show "Assign RM" for unassigned EMPs
  if (row.role === ROLES.EMP && !row.rmId) {
    buttons.push(`
      <button
        class="btn btn-secondary btn-sm"
        data-action="assign"
        data-emp-id="${escapeHTML(row.userId || row.id)}"
        data-emp-name="${escapeHTML(row.name || '')}"
        aria-label="Assign a manager to ${escapeHTML(row.name || '')}"
      >Assign RM</button>
    `);
  }

  // View reimbursements for any EMP
  if (row.role === ROLES.EMP) {
    buttons.push(`
      <button
        class="btn btn-ghost btn-sm"
        data-action="view-reimb"
        data-user-id="${escapeHTML(row.userId || row.id)}"
        data-user-name="${escapeHTML(row.name || '')}"
        aria-label="View reimbursements for ${escapeHTML(row.name || '')}"
      >View Requests</button>
    `);
  }

  if (!buttons.length) return `<span class="text-xs text-muted">—</span>`;

  return `<div class="table-actions">${buttons.join('')}</div>`;
}

/**
 * Handle clicks on CFO table action buttons.
 */
async function handleCfoTableClick(e) {
  const btn    = e.target.closest('[data-action]');
  if (!btn) return;

  const action   = btn.dataset.action;
  const empId    = btn.dataset.empId;
  const rmId     = btn.dataset.rmId;
  const empName  = btn.dataset.empName || 'this employee';
  const userId   = btn.dataset.userId;
  const userName = btn.dataset.userName;

  switch (action) {
    case 'assign':
      openAssignModal(empId, empName);
      break;

    case 'remove':
      await handleRemoveAssignment(btn, empId, rmId, empName);
      break;

    case 'view-reimb':
      await openReimbursementsModal(userId || empId, userName || empName);
      break;
  }
}

// -----------------------------------------------------------
// Assign Employee Modal
// -----------------------------------------------------------
function openAssignModal(preselectedEmpId = '', preselectedEmpName = '') {
  // Build options from allUsers
  const empOptions = allUsers
    .filter((u) => u.role === ROLES.EMP)
    .map((u) => `<option value="${escapeHTML(u.userId || u.id)}" ${(u.userId || u.id) === preselectedEmpId ? 'selected' : ''}>
      ${escapeHTML(u.name)} (${escapeHTML(u.email)})
    </option>`)
    .join('');

  const rmOptions = allUsers
    .filter((u) => u.role === ROLES.RM)
    .map((u) => `<option value="${escapeHTML(u.userId || u.id)}">
      ${escapeHTML(u.name)} (${escapeHTML(u.email)})
    </option>`)
    .join('');

  if (!empOptions) {
    Toast.warning('No employees', 'There are no employees (EMP role) to assign yet. Register new users and assign them the EMP role first.');
    return;
  }

  if (!rmOptions) {
    Toast.warning('No managers', 'There are no managers (RM role) registered yet. Assign the RM role to a user first.');
    return;
  }

  Modal.open({
    title:         preselectedEmpId ? `Assign Manager — ${preselectedEmpName}` : 'Assign Employee to Manager',
    size:          'md',
    confirmText:   'Assign',
    cancelText:    'Cancel',
    confirmVariant:'primary',
    bodyHTML: `
      <p class="text-sm text-muted" style="margin-bottom: var(--space-5);">
        Select an employee and their reporting manager. An employee can only have one manager at a time.
      </p>
      <form id="assign-form" novalidate>
        <div class="form-group">
          <label for="assign-emp-select" class="form-label">
            Employee <span class="required" aria-hidden="true">*</span>
          </label>
          <select id="assign-emp-select" class="form-select" ${preselectedEmpId ? 'disabled' : ''}>
            <option value="">— Select employee —</option>
            ${empOptions}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label for="assign-rm-select" class="form-label">
            Reporting Manager <span class="required" aria-hidden="true">*</span>
          </label>
          <select id="assign-rm-select" class="form-select">
            <option value="">— Select manager —</option>
            ${rmOptions}
          </select>
        </div>
      </form>
    `,
    onConfirm: () => handleAssignEmployee(preselectedEmpId),
  });
}

async function handleAssignEmployee(preselectedEmpId) {
  const empSelect = document.getElementById('assign-emp-select');
  const rmSelect  = document.getElementById('assign-rm-select');

  const empId = preselectedEmpId || empSelect?.value;
  const rmId  = rmSelect?.value;

  // Validate selections
  if (!empId) {
    showSelectError('assign-emp-select', 'Please select an employee.');
    return;
  }
  if (!rmId) {
    showSelectError('assign-rm-select', 'Please select a reporting manager.');
    return;
  }

  Modal.setLoading(true);

  try {
    await assignEmployee({ empId, rmId });
    Modal.close();

    Toast.success('Assignment created!', 'The employee has been assigned to the manager.');

    // Refresh data
    await refreshCfoTable();

  } catch (err) {
    Modal.setLoading(false);
    Toast.error('Assignment failed', err.message || 'Please try again.');
  }
}

// -----------------------------------------------------------
// Remove Assignment
// -----------------------------------------------------------
async function handleRemoveAssignment(btn, empId, rmId, empName) {
  const confirmed = await Modal.confirm({
    title:       'Remove Assignment',
    message:     `Remove the manager assignment for ${empName}? They will become unassigned.`,
    confirmText: 'Remove',
    type:        'danger',
  });

  if (!confirmed) return;

  btn.disabled    = true;
  btn.textContent = '…';

  try {
    await removeAssignment({ empId, rmId });
    Toast.success('Assignment removed', `${empName} is now unassigned.`);
    await refreshCfoTable();
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Remove RM';
    Toast.error('Failed to remove', err.message || 'Please try again.');
  }
}

// -----------------------------------------------------------
// View Reimbursements Modal (CFO drill-down)
// -----------------------------------------------------------
async function openReimbursementsModal(userId, userName) {
  // Open modal with loading state in body
  Modal.open({
    title:      `Reimbursements — ${userName}`,
    size:       'lg',
    hideFooter: false,
    confirmText:'Close',
    cancelText: '',
    confirmVariant: 'secondary',
    bodyHTML:   `<div class="inline-loader"><div class="spinner spinner-sm"></div><span>Loading…</span></div>`,
    onConfirm:  () => Modal.close(),
    onCancel:   () => Modal.close(),
  });

  // Hide cancel button (only "Close" needed)
  const cancelBtn = document.getElementById('modal-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';

  try {
    const response       = await getUserReimbursements(userId);
    const reimbursements = response?.data?.reimbursements || [];

    const body = Modal.getBody();
    if (!body) return;

    if (!reimbursements.length) {
      body.innerHTML = `
        <div class="empty-state" style="padding: var(--space-10);">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">No reimbursements</div>
          <div class="empty-state-desc">${escapeHTML(userName)} hasn't submitted any requests yet.</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${reimbursements.map((r) => `
              <tr>
                <td>
                  <div class="text-sm font-medium">${escapeHTML(r.title || '—')}</div>
                  <div class="text-xs text-muted">${escapeHTML(truncateStr(r.description, 60))}</div>
                </td>
                <td class="table-amount">${formatCurrency(r.amount)}</td>
                <td>${statusBadge(r.status)}</td>
                <td class="text-sm text-muted">${formatDate(r.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    const body = Modal.getBody();
    if (body) body.innerHTML = `
      <div class="auth-alert error">
        <span>⚠</span>
        <span>Failed to load reimbursements: ${escapeHTML(err.message)}</span>
      </div>
    `;
  }
}

// -----------------------------------------------------------
// Refresh table after mutations
// -----------------------------------------------------------
async function refreshCfoTable() {
  try {
    const response = await getEmployees();
    allUsers = response?.data?.users || [];
    dataTable.setData(allUsers);

    // Update stats strip numbers
    const statValues = document.querySelectorAll('.cfo-stat-value');
    if (statValues.length >= 4) {
      statValues[0].textContent = allUsers.filter((u) => u.role === ROLES.EMP).length;
      statValues[1].textContent = allUsers.filter((u) => u.role === ROLES.RM).length;
      statValues[2].textContent = allUsers.filter((u) => u.role === ROLES.APE).length;
      statValues[3].textContent = allUsers.length;
    }
  } catch { /* silent — data is already partially updated */ }
}

// ============================================================
// RM — My Team (read-only)
// ============================================================
async function renderRmPage(container) {
  const response = await getEmployees();
  const team     = response?.data?.users || [];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">My Team</h2>
        <p class="page-subtitle">Employees assigned to you — ${team.length} member${team.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Assigned Employees</h3>
          <p class="card-subtitle">You can view their reimbursements from the Approvals page</p>
        </div>
      </div>
      <div id="rm-team-table"></div>
    </div>
  `;

  new DataTable({
    containerId:  'rm-team-table',
    pageSize:     10,
    searchable:   true,
    emptyTitle:   'No employees assigned',
    emptyDesc:    'Ask your CFO to assign employees to your team.',
    columns: [
      {
        key:      'name',
        label:    'Employee',
        sortable: true,
        render:   (val, row) => `
          <div class="table-user-cell">
            <div class="avatar avatar-sm">${getInitials(val)}</div>
            <div>
              <div class="table-user-name">${escapeHTML(val || '—')}</div>
              <div class="table-user-email">${escapeHTML(row.email || '')}</div>
            </div>
          </div>
        `,
      },
      {
        key:      'email',
        label:    'Email',
        sortable: true,
        render:   (val) => `<span class="text-sm">${escapeHTML(val || '—')}</span>`,
      },
      {
        key:      'role',
        label:    'Role',
        sortable: false,
        render:   (val) => roleBadge(val),
      },
    ],
  }).setData(team);
}

// ============================================================
// APE — All employees (read-only)
// ============================================================
async function renderApePage(container) {
  const response = await getEmployees();
  const users    = response?.data?.users || [];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Organisation Staff</h2>
        <p class="page-subtitle">All employees and managers — ${users.length} total</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Staff Directory</h3>
          <p class="card-subtitle">Read-only view of all registered employees and managers</p>
        </div>
      </div>
      <div id="ape-staff-table"></div>
    </div>
  `;

  new DataTable({
    containerId:  'ape-staff-table',
    pageSize:     12,
    searchable:   true,
    emptyTitle:   'No staff found',
    emptyDesc:    'No users have been registered yet.',
    columns: [
      {
        key:      'name',
        label:    'Name',
        sortable: true,
        render:   (val, row) => `
          <div class="table-user-cell">
            <div class="avatar avatar-sm">${getInitials(val)}</div>
            <div>
              <div class="table-user-name">${escapeHTML(val || '—')}</div>
              <div class="table-user-email">${escapeHTML(row.email || '')}</div>
            </div>
          </div>
        `,
      },
      {
        key:      'role',
        label:    'Role',
        sortable: true,
        render:   (val) => roleBadge(val),
      },
      {
        key:      'rmName',
        label:    'Manager',
        sortable: true,
        render:   (val, row) => {
          if (row.role !== ROLES.EMP) return `<span class="text-xs text-muted">—</span>`;
          if (!val) return `<span class="badge badge-pending">Unassigned</span>`;
          return `<span class="text-sm">${escapeHTML(val)}</span>`;
        },
      },
    ],
  }).setData(users);
}

// ============================================================
// Utility helpers
// ============================================================

function cfoCfgStat(icon, label, value, color) {
  return `
    <div class="stat-card" style="padding: var(--space-4);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);">
        <div>
          <div class="stat-card-label">${label}</div>
          <div class="stat-card-value cfo-stat-value" style="font-size:1.75rem;">${value}</div>
        </div>
        <div class="stat-card-icon ${color}" style="margin:0; flex-shrink:0;">${icon}</div>
      </div>
    </div>
  `;
}

function showSelectError(selectId, message) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.classList.add('error');
  const existing = select.parentElement.querySelector('.form-error');
  existing?.remove();
  const err = document.createElement('p');
  err.className = 'form-error';
  err.textContent = message;
  select.parentElement.appendChild(err);
  select.focus();
}

function errorState(message) {
  return `
    <div class="empty-state" style="min-height:60vh;">
      <div class="empty-state-icon">⚠️</div>
      <h2 class="empty-state-title">Failed to load</h2>
      <p class="empty-state-desc">${escapeHTML(message)}</p>
      <button class="btn btn-primary" onclick="location.reload()" style="margin-top:var(--space-6);">
        Try again
      </button>
    </div>
  `;
}

function truncateStr(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// -----------------------------------------------------------
// Boot
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
