/**
 * roles.js
 * Role Management page — CFO only.
 *
 * Allows the CFO to:
 *  - View all registered users and their current roles
 *  - Assign or change a user's role (EMP, RM, APE)
 *  - See a summary breakdown of the organisation's role distribution
 *
 * Route: /pages/roles.html
 * Access: CFO only (router blocks all other roles)
 *
 * API used:
 *  GET  /rest/employees       → fetch all users
 *  POST /rest/roles/assign    → assign a role
 */

import Router         from '../utils/router.js';
import Sidebar        from '../components/sidebar.js';
import Navbar         from '../components/navbar.js';
import Modal          from '../components/modal.js';
import Toast          from '../components/toast.js';
import Loader         from '../components/loader.js';
import DataTable      from '../components/table.js';
import { ROLES, ROLE_LABELS } from '../utils/constants.js';
import { getEmployees }       from '../api/employee.js';
import { assignRole }         from '../api/role.js';
import {
  roleBadge,
  escapeHTML,
  getInitials,
}                     from '../utils/helpers.js';

// -----------------------------------------------------------
// Page state
// -----------------------------------------------------------
let currentUser = null;
let dataTable   = null;
let allUsers    = [];

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------
async function init() {
  currentUser = await Router.guard();

  Sidebar.render({ user: currentUser });
  Navbar.render({ title: 'Role Management', user: currentUser });

  const content = document.getElementById('page-content');
  Loader.showInline(content, 'Loading users…');

  try {
    await renderPage(content);
  } catch (err) {
    content.innerHTML = errorState(err.message);
    Toast.error('Error', err.message);
  }
}

// ============================================================
// Main page render
// ============================================================
async function renderPage(container) {
  const response = await getEmployees();
  allUsers       = response?.data?.users || [];

  // Role breakdown counts
  const counts = {
    [ROLES.EMP]: allUsers.filter((u) => u.role === ROLES.EMP).length,
    [ROLES.RM]:  allUsers.filter((u) => u.role === ROLES.RM).length,
    [ROLES.APE]: allUsers.filter((u) => u.role === ROLES.APE).length,
    [ROLES.CFO]: allUsers.filter((u) => u.role === ROLES.CFO).length,
  };
  const unassigned = allUsers.filter((u) => !u.role).length;

  container.innerHTML = `
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Role Management</h2>
        <p class="page-subtitle">Assign and manage roles for all registered users in the organisation</p>
      </div>
    </div>

    <!-- Role Distribution Cards -->
    <div class="stats-grid" style="margin-bottom: var(--space-6);">
      ${roleStatCard(ROLES.EMP, counts[ROLES.EMP], '👤', 'blue')}
      ${roleStatCard(ROLES.RM,  counts[ROLES.RM],  '👔', 'purple')}
      ${roleStatCard(ROLES.APE, counts[ROLES.APE], '💼', 'yellow')}
      ${roleStatCard(ROLES.CFO, counts[ROLES.CFO], '🏦', 'green')}
    </div>

    <!-- Role Description Info Box -->
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card-header">
        <h3 class="card-title">Role Descriptions</h3>
      </div>
      <div class="card-body" style="padding: var(--space-4) var(--space-6);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
          ${roleDescCard('👤', ROLES.EMP, ROLE_LABELS[ROLES.EMP],
            'Can submit reimbursement requests. Has one assigned Reporting Manager.')}
          ${roleDescCard('👔', ROLES.RM,  ROLE_LABELS[ROLES.RM],
            'Reviews and approves or rejects requests from assigned Employees.')}
          ${roleDescCard('💼', ROLES.APE, ROLE_LABELS[ROLES.APE],
            'Second-level approval — reviews requests already approved by RM.')}
          ${roleDescCard('🏦', ROLES.CFO, ROLE_LABELS[ROLES.CFO],
            'Final approver. Manages roles and employee assignments. Cannot be assigned.')}
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">All Users</h3>
          <p class="card-subtitle">${allUsers.length} registered user${allUsers.length !== 1 ? 's' : ''}
            ${unassigned ? ` · <span style="color:var(--color-warning)">${unassigned} unassigned</span>` : ''}
          </p>
        </div>
      </div>
      <div id="roles-table-container"></div>
    </div>
  `;

  buildTable();
}

// ============================================================
// DataTable
// ============================================================
function buildTable() {
  dataTable = new DataTable({
    containerId:  'roles-table-container',
    pageSize:     12,
    searchable:   true,
    emptyTitle:   'No users found',
    emptyDesc:    'No users are registered yet. Share the registration link.',
    columns: [
      {
        key:      'name',
        label:    'User',
        sortable: true,
        render:   (val, row) => `
          <div class="table-user-cell">
            <div class="avatar avatar-sm" style="${avatarColor(row.role)}">${getInitials(val)}</div>
            <div>
              <div class="table-user-name">${escapeHTML(val || '—')}</div>
              <div class="table-user-email">${escapeHTML(row.email || '')}</div>
            </div>
          </div>
        `,
      },
      {
        key:      'role',
        label:    'Current Role',
        sortable: true,
        render:   (val) => val
          ? roleBadge(val)
          : `<span class="badge badge-pending" style="background:var(--color-gray-100);color:var(--color-gray-500);">No Role</span>`,
      },
      {
        key:      'role',
        label:    'Role Title',
        sortable: false,
        render:   (val) => `<span class="text-sm text-muted">${escapeHTML(ROLE_LABELS[val] || '—')}</span>`,
      },
      {
        key:      'userId',
        label:    'Actions',
        sortable: false,
        render:   (val, row) => buildActionCell(row),
      },
    ],
  });

  dataTable.setData(allUsers);

  // Role filter in toolbar
  const toolbarRight = dataTable.getToolbarRight();
  if (toolbarRight) {
    toolbarRight.innerHTML = `
      <select class="filter-select" id="role-filter" aria-label="Filter by role">
        <option value="">All roles</option>
        <option value="EMP">Employee (EMP)</option>
        <option value="RM">Manager (RM)</option>
        <option value="APE">APE</option>
        <option value="CFO">CFO</option>
        <option value="">No role</option>
      </select>
    `;
    document.getElementById('role-filter')?.addEventListener('change', (e) => {
      const filtered = e.target.value
        ? allUsers.filter((u) => u.role === e.target.value)
        : allUsers;
      dataTable.setData(filtered);
    });
  }

  // Delegate clicks
  document.getElementById('roles-table-container')
    ?.addEventListener('click', handleTableClick);
}

/**
 * Build the action cell for a user row.
 */
function buildActionCell(row) {
  // CFO cannot have their role changed
  if (row.role === ROLES.CFO) {
    return `<span class="text-xs text-muted" title="CFO role cannot be reassigned">Protected</span>`;
  }

  // Current user cannot reassign themselves
  if ((row.userId || row.id) === currentUser.userId) {
    return `<span class="text-xs text-muted" title="You cannot change your own role">—</span>`;
  }

  return `
    <button
      class="btn btn-secondary btn-sm"
      data-action="assign-role"
      data-user-id="${escapeHTML(row.userId || row.id)}"
      data-user-name="${escapeHTML(row.name || '')}"
      data-current-role="${escapeHTML(row.role || '')}"
      aria-label="Assign role to ${escapeHTML(row.name || 'user')}"
    >
      ${row.role ? 'Change Role' : 'Assign Role'}
    </button>
  `;
}

// ============================================================
// Event handlers
// ============================================================

function handleTableClick(e) {
  const btn = e.target.closest('[data-action="assign-role"]');
  if (!btn) return;

  openAssignRoleModal({
    userId:      btn.dataset.userId,
    userName:    btn.dataset.userName,
    currentRole: btn.dataset.currentRole,
  });
}

// ============================================================
// Assign Role Modal
// ============================================================
function openAssignRoleModal({ userId, userName, currentRole }) {
  // Assignable roles (not CFO — CFO is seeded, cannot be assigned via UI)
  const assignableRoles = [ROLES.EMP, ROLES.RM, ROLES.APE];

  const roleOptions = assignableRoles.map((role) => {
    const isSelected = role === currentRole;
    const label      = ROLE_LABELS[role];
    const icon       = { EMP: '👤', RM: '👔', APE: '💼' }[role];
    return `
      <label class="role-radio-option ${isSelected ? 'selected' : ''}" for="role-opt-${role}">
        <input
          type="radio"
          name="new-role"
          id="role-opt-${role}"
          value="${role}"
          ${isSelected ? 'checked' : ''}
          class="role-radio-input"
        />
        <div class="role-radio-content">
          <span class="role-radio-icon" aria-hidden="true">${icon}</span>
          <div>
            <div class="role-radio-label">${role}</div>
            <div class="role-radio-desc">${label}</div>
          </div>
        </div>
        <span class="role-radio-check" aria-hidden="true">✓</span>
      </label>
    `;
  }).join('');

  Modal.open({
    title:         `Assign Role — ${userName}`,
    size:          'md',
    confirmText:   'Assign Role',
    cancelText:    'Cancel',
    confirmVariant:'primary',
    bodyHTML: `
      <div style="margin-bottom: var(--space-5);">
        <div class="table-user-cell" style="margin-bottom: var(--space-4);">
          <div class="avatar" style="${avatarColor(currentRole)}">${getInitials(userName)}</div>
          <div>
            <div class="table-user-name" style="font-size: var(--font-size-base);">${escapeHTML(userName)}</div>
            <div class="table-user-email">
              Current role: ${currentRole ? roleBadge(currentRole) : '<span class="text-muted">None</span>'}
            </div>
          </div>
        </div>
        <p class="text-sm text-muted">Select the new role to assign. This change takes effect immediately.</p>
      </div>

      <div class="role-radio-group" id="role-radio-group" role="radiogroup" aria-label="Select role">
        ${roleOptions}
      </div>

      <div id="role-assign-error" class="form-error hidden" role="alert" style="margin-top: var(--space-3);"></div>

      <div class="auth-alert warning hidden" id="role-change-warning" style="margin-top: var(--space-4);">
        <span class="auth-alert-icon">⚠</span>
        <span id="role-change-warning-msg"></span>
      </div>
    `,
    onConfirm: () => handleAssignRole(userId, userName, currentRole),
  });

  // Inject radio styles
  injectRadioStyles();

  // Show warning when selecting a different role than current
  document.getElementById('role-radio-group')?.addEventListener('change', (e) => {
    const selectedRole = e.target.value;
    const warning      = document.getElementById('role-change-warning');
    const warningMsg   = document.getElementById('role-change-warning-msg');

    // Update visual selection
    document.querySelectorAll('.role-radio-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.querySelector('input').value === selectedRole);
    });

    if (currentRole && selectedRole !== currentRole) {
      warning.classList.remove('hidden');
      warningMsg.textContent =
        `Changing from ${currentRole} to ${selectedRole} may affect existing approvals and team assignments.`;
    } else {
      warning.classList.add('hidden');
    }
  });
}

async function handleAssignRole(userId, userName, currentRole) {
  // Read selected role
  const selected = document.querySelector('input[name="new-role"]:checked');
  const newRole  = selected?.value;

  const errorEl = document.getElementById('role-assign-error');

  if (!newRole) {
    if (errorEl) {
      errorEl.textContent = 'Please select a role to assign.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  // Warn if same role selected
  if (newRole === currentRole) {
    if (errorEl) {
      errorEl.textContent = `${userName} already has the ${currentRole} role. Please select a different role.`;
      errorEl.classList.remove('hidden');
    }
    return;
  }

  Modal.setLoading(true);

  try {
    await assignRole({ userId, role: newRole });
    Modal.close();

    Toast.success(
      'Role assigned!',
      `${userName} has been assigned the ${newRole} (${ROLE_LABELS[newRole]}) role.`
    );

    // Refresh the table with updated data
    await refreshTable();

  } catch (err) {
    Modal.setLoading(false);

    if (errorEl) {
      errorEl.textContent = err.message || 'Role assignment failed. Please try again.';
      errorEl.classList.remove('hidden');
    }
  }
}

// -----------------------------------------------------------
// Refresh table + stats after mutation
// -----------------------------------------------------------
async function refreshTable() {
  try {
    const response = await getEmployees();
    allUsers       = response?.data?.users || [];

    // Update the DataTable
    dataTable.setData(allUsers);

    // Update stat cards
    const statEls = document.querySelectorAll('.role-stat-value');
    const counts  = {
      [ROLES.EMP]: allUsers.filter((u) => u.role === ROLES.EMP).length,
      [ROLES.RM]:  allUsers.filter((u) => u.role === ROLES.RM).length,
      [ROLES.APE]: allUsers.filter((u) => u.role === ROLES.APE).length,
      [ROLES.CFO]: allUsers.filter((u) => u.role === ROLES.CFO).length,
    };
    const order = [ROLES.EMP, ROLES.RM, ROLES.APE, ROLES.CFO];
    statEls.forEach((el, i) => {
      if (order[i]) el.textContent = counts[order[i]];
    });

    // Update subtitle
    const subtitle = document.querySelector('.card-subtitle');
    if (subtitle) {
      const unassigned = allUsers.filter((u) => !u.role).length;
      subtitle.innerHTML = `${allUsers.length} registered user${allUsers.length !== 1 ? 's' : ''}
        ${unassigned ? ` · <span style="color:var(--color-warning)">${unassigned} unassigned</span>` : ''}`;
    }

  } catch { /* silent — table stays as-is */ }
}

// ============================================================
// Rendering helpers
// ============================================================

function roleStatCard(role, count, icon, color) {
  const label = ROLE_LABELS[role] || role;
  return `
    <div class="stat-card" style="padding: var(--space-4);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);">
        <div>
          <div class="stat-card-label" style="font-size:var(--font-size-xs);">${escapeHTML(role)}</div>
          <div class="stat-card-value role-stat-value" style="font-size:1.75rem;">${count}</div>
          <div class="text-xs text-muted">${escapeHTML(label)}</div>
        </div>
        <div class="stat-card-icon ${color}" style="margin:0; flex-shrink:0;">${icon}</div>
      </div>
    </div>
  `;
}

function roleDescCard(icon, role, label, description) {
  return `
    <div style="
      padding: var(--space-4);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-xl);
      background: var(--color-gray-50);
    ">
      <div style="display:flex; align-items:center; gap:var(--space-2); margin-bottom: var(--space-2);">
        <span style="font-size:1.25rem;" aria-hidden="true">${icon}</span>
        ${roleBadge(role)}
      </div>
      <div class="text-sm font-medium" style="margin-bottom: var(--space-1);">${escapeHTML(label)}</div>
      <div class="text-xs text-muted">${escapeHTML(description)}</div>
    </div>
  `;
}

/** Avatar background colour per role */
function avatarColor(role) {
  const colors = {
    [ROLES.EMP]: 'background: var(--color-primary);',
    [ROLES.RM]:  'background: #7c3aed;',
    [ROLES.APE]: 'background: #d97706;',
    [ROLES.CFO]: 'background: var(--color-success);',
  };
  return colors[role] || 'background: var(--color-gray-400);';
}

/** Inject radio card styles once (idempotent) */
function injectRadioStyles() {
  if (document.getElementById('role-radio-styles')) return;
  const style = document.createElement('style');
  style.id = 'role-radio-styles';
  style.textContent = `
    .role-radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .role-radio-option {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      border: 2px solid var(--color-gray-200);
      border-radius: var(--radius-xl);
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
    }
    .role-radio-option:hover {
      border-color: var(--color-primary);
      background: rgba(37, 99, 235, 0.02);
    }
    .role-radio-option.selected {
      border-color: var(--color-primary);
      background: rgba(37, 99, 235, 0.04);
    }
    .role-radio-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .role-radio-content {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
    }
    .role-radio-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .role-radio-label {
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-sm);
      color: var(--color-gray-900);
    }
    .role-radio-desc {
      font-size: var(--font-size-xs);
      color: var(--color-gray-500);
    }
    .role-radio-check {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      font-weight: 700;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }
    .role-radio-option.selected .role-radio-check {
      opacity: 1;
    }
    .auth-alert.warning {
      background: var(--color-warning-light, #fffbeb);
      border-color: var(--color-warning-border, #fde68a);
      color: var(--color-warning, #d97706);
    }
  `;
  document.head.appendChild(style);
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

// -----------------------------------------------------------
// Boot
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
