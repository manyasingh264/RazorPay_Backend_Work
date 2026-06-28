/**
 * reimbursements.js
 * Role-aware Reimbursements page controller.
 *
 * EMP  → Submit form + personal history table
 * RM   → Pending approvals table with Approve/Reject
 * APE  → Pending approvals table (already RM-approved) with Approve/Reject
 * CFO  → All reimbursements, filter by status, Approve/Reject
 */

import Router               from '../utils/router.js';
import Sidebar              from '../components/sidebar.js';
import Navbar               from '../components/navbar.js';
import Modal                from '../components/modal.js';
import Toast                from '../components/toast.js';
import Loader               from '../components/loader.js';
import DataTable            from '../components/table.js';
import { ROLES, STATUS }    from '../utils/constants.js';
import ReimbursementService from '../services/reimbursementService.js';
import {
  validateReimbursementForm,
  showFormErrors,
  clearFormErrors,
  showFieldError,
}                           from '../utils/validators.js';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  escapeHTML,
  getInitials,
}                           from '../utils/helpers.js';

// -----------------------------------------------------------
// Page state
// -----------------------------------------------------------
let currentUser = null;
let dataTable   = null;     // DataTable instance (for RM/APE/CFO)
let allData     = [];       // current loaded reimbursements

// -----------------------------------------------------------
// Init
// -----------------------------------------------------------
async function init() {
  currentUser = await Router.guard();

  Sidebar.render({ user: currentUser });
  Navbar.render({ title: 'Reimbursements', user: currentUser });

  const content = document.getElementById('page-content');
  Loader.showInline(content, 'Loading…');

  try {
    switch (currentUser.role) {
      case ROLES.EMP: await renderEmpPage(content);  break;
      case ROLES.RM:  await renderApprovalPage(content, 'RM');  break;
      case ROLES.APE: await renderApprovalPage(content, 'APE'); break;
      case ROLES.CFO: await renderCfoPage(content);  break;
    }
  } catch (err) {
    content.innerHTML = errorState(err.message);
    Toast.error('Error', err.message);
  }
}

// ============================================================
// EMP — Submit form + history table
// ============================================================
async function renderEmpPage(container) {
  const reimbursements = await ReimbursementService.getAll();
  allData = reimbursements;

  container.innerHTML = `
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">My Reimbursements</h2>
        <p class="page-subtitle">Submit and track your expense requests</p>
      </div>
      <button class="btn btn-primary" id="open-submit-modal">
        + New Request
      </button>
    </div>

    <!-- Quick Stats Strip -->
    <div class="stats-grid" style="margin-bottom: var(--space-6);">
      ${miniStat('📄', 'Total', reimbursements.length)}
      ${miniStat('⏳', 'Pending',  reimbursements.filter(r => r.status === STATUS.PENDING).length,  'yellow')}
      ${miniStat('✅', 'Approved', reimbursements.filter(r => r.status === STATUS.APPROVED).length, 'green')}
      ${miniStat('❌', 'Rejected', reimbursements.filter(r => r.status === STATUS.REJECTED).length, 'red')}
    </div>

    <!-- History Table -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Request History</h3>
          <p class="card-subtitle">All your submitted reimbursement requests</p>
        </div>
      </div>
      <div id="emp-table-container"></div>
    </div>
  `;

  // Build DataTable
  dataTable = new DataTable({
    containerId:  'emp-table-container',
    pageSize:     10,
    searchable:   true,
    emptyTitle:   'No requests yet',
    emptyDesc:    'Click "+ New Request" to submit your first reimbursement.',
    columns: [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        render: (val, row) => `
          <div>
            <div class="text-sm font-medium">${escapeHTML(val || '—')}</div>
            <div class="text-xs text-muted" style="margin-top:2px">${escapeHTML(truncateStr(row.description, 50))}</div>
          </div>
        `,
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (val) => `<span class="table-amount">${formatCurrency(val)}</span>`,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (val) => statusBadge(val),
      },
      {
        key: 'createdAt',
        label: 'Submitted',
        sortable: true,
        render: (val) => `<span class="text-sm text-muted">${formatDate(val)}</span>`,
      },
      {
        key: 'approvalStage',
        label: 'Stage',
        sortable: false,
        render: (_, row) => approvalStageHTML(row),
      },
    ],
  });

  dataTable.setData(reimbursements);

  // Add filter to toolbar right
  const toolbarRight = dataTable.getToolbarRight();
  if (toolbarRight) {
    toolbarRight.innerHTML = `
      <select class="filter-select" id="emp-status-filter" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
    `;
    document.getElementById('emp-status-filter')?.addEventListener('change', (e) => {
      const filtered = ReimbursementService.filterByStatus(allData, e.target.value);
      dataTable.setData(filtered);
    });
  }

  // Open submit modal
  document.getElementById('open-submit-modal')?.addEventListener('click', openSubmitModal);
}

// -----------------------------------------------------------
// Submit Reimbursement Modal
// -----------------------------------------------------------
function openSubmitModal() {
  Modal.open({
    title:         'Submit Reimbursement Request',
    size:          'md',
    confirmText:   'Submit Request',
    cancelText:    'Cancel',
    confirmVariant:'primary',
    bodyHTML: `
      <form id="submit-reimb-form" novalidate>
        <div class="form-group">
          <label for="reimb-title" class="form-label">
            Title <span class="required" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="reimb-title"
            class="form-input"
            placeholder="e.g. Conference travel, Office supplies"
            maxlength="100"
            required
          />
        </div>

        <div class="form-group">
          <label for="reimb-amount" class="form-label">
            Amount (₹) <span class="required" aria-hidden="true">*</span>
          </label>
          <div class="amount-input-wrapper">
            <span class="amount-prefix">₹</span>
            <input
              type="number"
              id="reimb-amount"
              class="form-input"
              placeholder="0.00"
              min="1"
              step="0.01"
              required
            />
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0">
          <label for="reimb-description" class="form-label">
            Description <span class="required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="reimb-description"
            class="form-textarea"
            placeholder="Describe what this expense is for, dates, and any other relevant details…"
            maxlength="500"
            required
            rows="4"
          ></textarea>
          <p class="form-helper" id="desc-char-count">0 / 500 characters</p>
        </div>
      </form>
    `,
    onConfirm: handleSubmitReimbursement,
  });

  // Character counter for description
  document.getElementById('reimb-description')?.addEventListener('input', (e) => {
    const count = e.target.value.length;
    const counter = document.getElementById('desc-char-count');
    if (counter) counter.textContent = `${count} / 500 characters`;
  });

  // Clear field errors on input
  document.getElementById('reimb-title')?.addEventListener('input',
    () => clearFieldErrorInModal('reimb-title'));
  document.getElementById('reimb-amount')?.addEventListener('input',
    () => clearFieldErrorInModal('reimb-amount'));
  document.getElementById('reimb-description')?.addEventListener('input',
    () => clearFieldErrorInModal('reimb-description'));
}

async function handleSubmitReimbursement() {
  const title       = document.getElementById('reimb-title')?.value?.trim();
  const amount      = document.getElementById('reimb-amount')?.value;
  const description = document.getElementById('reimb-description')?.value?.trim();

  // Validate
  const { valid, errors } = validateReimbursementForm({ title, description, amount });
  if (!valid) {
    showFormErrors(errors, 'reimb-');
    return; // don't close modal
  }

  Modal.setLoading(true);

  try {
    await ReimbursementService.submit({ title, description, amount: parseFloat(amount) });
    Modal.close();
    Toast.success('Request submitted!', 'Your reimbursement request is now pending approval.');

    // Refresh table
    const fresh = await ReimbursementService.getAll();
    allData = fresh;
    dataTable.setData(fresh);

    // Update stats strip
    updateEmpStats(fresh);

  } catch (err) {
    Modal.setLoading(false);
    Toast.error('Submission failed', err.message || 'Please try again.');
  }
}

function updateEmpStats(reimbursements) {
  const stripItems = document.querySelectorAll('.mini-stat-value');
  if (!stripItems.length) return;
  const vals = [
    reimbursements.length,
    reimbursements.filter(r => r.status === STATUS.PENDING).length,
    reimbursements.filter(r => r.status === STATUS.APPROVED).length,
    reimbursements.filter(r => r.status === STATUS.REJECTED).length,
  ];
  stripItems.forEach((el, i) => { if (vals[i] !== undefined) el.textContent = vals[i]; });
}

// ============================================================
// RM / APE — Approval Table
// ============================================================
async function renderApprovalPage(container, role) {
  const reimbursements = await ReimbursementService.getAll();
  allData = reimbursements;

  const roleLabel = role === 'RM' ? 'Manager' : 'APE';
  const desc = role === 'RM'
    ? 'Review and approve or reject pending requests from your team'
    : 'Review requests that have already been approved by the Reporting Manager';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Pending Approvals</h2>
        <p class="page-subtitle">${desc}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge badge-pending" style="font-size:var(--font-size-sm);padding:var(--space-2) var(--space-3);">
          ${reimbursements.length} pending
        </span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Reimbursement Requests</h3>
          <p class="card-subtitle">Click Approve or Reject for each request</p>
        </div>
      </div>
      <div id="approval-table-container"></div>
    </div>
  `;

  buildApprovalTable('approval-table-container', reimbursements);
}

function buildApprovalTable(containerId, data) {
  dataTable = new DataTable({
    containerId,
    pageSize:   10,
    searchable: true,
    emptyTitle: 'No pending approvals',
    emptyDesc:  'All caught up! Check back later.',
    columns: [
      {
        key: 'employeeName',
        label: 'Employee',
        sortable: true,
        render: (val, row) => `
          <div class="table-user-cell">
            <div class="avatar avatar-sm">${getInitials(val || row.name)}</div>
            <div>
              <div class="table-user-name">${escapeHTML(val || row.name || '—')}</div>
              <div class="table-user-email">${escapeHTML(row.employeeEmail || row.email || '')}</div>
            </div>
          </div>
        `,
      },
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        render: (val, row) => `
          <div>
            <div class="text-sm font-medium">${escapeHTML(val || '—')}</div>
            <div class="text-xs text-muted" title="${escapeHTML(row.description || '')}"
              style="margin-top:2px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHTML(truncateStr(row.description, 60))}
            </div>
          </div>
        `,
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (val) => `<span class="table-amount">${formatCurrency(val)}</span>`,
      },
      {
        key: 'createdAt',
        label: 'Submitted',
        sortable: true,
        render: (val) => `<span class="text-sm text-muted">${formatDate(val)}</span>`,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (val) => statusBadge(val),
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => `
          <div class="approval-actions">
            <button
              class="btn-approve"
              data-user-id="${escapeHTML(row.empId || row.userId || row.id || '')}"
              data-name="${escapeHTML(row.employeeName || row.name || '')}"
              aria-label="Approve reimbursement for ${escapeHTML(row.employeeName || '')}"
            >✓ Approve</button>
            <button
              class="btn-reject"
              data-user-id="${escapeHTML(row.empId || row.userId || row.id || '')}"
              data-name="${escapeHTML(row.employeeName || row.name || '')}"
              aria-label="Reject reimbursement for ${escapeHTML(row.employeeName || '')}"
            >✕ Reject</button>
          </div>
        `,
      },
    ],
  });

  dataTable.setData(data);

  // Delegate approve/reject click events
  document.getElementById(containerId)?.addEventListener('click', handleApprovalClick);
}

async function handleApprovalClick(e) {
  const approveBtn = e.target.closest('.btn-approve');
  const rejectBtn  = e.target.closest('.btn-reject');

  if (!approveBtn && !rejectBtn) return;

  const btn    = approveBtn || rejectBtn;
  const userId = btn.dataset.userId;
  const name   = btn.dataset.name || 'this employee';
  const action = approveBtn ? 'approve' : 'reject';

  if (!userId) {
    Toast.error('Error', 'Could not determine employee ID.');
    return;
  }

  // Confirmation dialog
  const confirmed = await Modal.confirm({
    title:       `${action === 'approve' ? 'Approve' : 'Reject'} Reimbursement`,
    message:     `Are you sure you want to ${action} the reimbursement request from ${name}? This action cannot be undone.`,
    confirmText: action === 'approve' ? 'Yes, Approve' : 'Yes, Reject',
    type:        action === 'approve' ? 'success' : 'danger',
  });

  if (!confirmed) return;

  // Disable the row's buttons while processing
  const row     = btn.closest('tr');
  const buttons = row?.querySelectorAll('.btn-approve, .btn-reject');
  buttons?.forEach((b) => { b.disabled = true; b.style.opacity = '0.5'; });

  try {
    if (action === 'approve') {
      await ReimbursementService.approve(userId);
      Toast.success('Approved!', `Reimbursement for ${name} has been approved.`);
    } else {
      await ReimbursementService.reject(userId);
      Toast.warning('Rejected', `Reimbursement for ${name} has been rejected.`);
    }

    // Remove the row from the table (it's no longer pending)
    allData = allData.filter(
      (r) => (r.empId || r.userId || r.id) !== userId
    );
    dataTable.setData(allData);

    // Update pending badge in sidebar
    Sidebar.setBadge('nav-reimbursements', allData.length);

  } catch (err) {
    buttons?.forEach((b) => { b.disabled = false; b.style.opacity = ''; });
    Toast.error('Action failed', err.message || 'Please try again.');
  }
}

// ============================================================
// CFO — Full reimbursement list with filter + search
// ============================================================
async function renderCfoPage(container) {
  const reimbursements = await ReimbursementService.getAll();
  allData = reimbursements;

  const pending  = reimbursements.filter(r => r.status === STATUS.PENDING).length;
  const approved = reimbursements.filter(r => r.status === STATUS.APPROVED).length;
  const rejected = reimbursements.filter(r => r.status === STATUS.REJECTED).length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">All Reimbursements</h2>
        <p class="page-subtitle">Final approval stage — review and act on all pending requests</p>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="stats-grid" style="margin-bottom: var(--space-6);">
      ${miniStat('📄', 'Total',    reimbursements.length)}
      ${miniStat('⏳', 'Pending',  pending,  'yellow')}
      ${miniStat('✅', 'Approved', approved, 'green')}
      ${miniStat('❌', 'Rejected', rejected, 'red')}
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Reimbursement Requests</h3>
          <p class="card-subtitle">All requests across the organisation</p>
        </div>
      </div>
      <div id="cfo-table-container"></div>
    </div>
  `;

  // CFO table (same as approval table but with status filter)
  buildApprovalTable('cfo-table-container', reimbursements);

  // Add status filter to toolbar
  const toolbarRight = dataTable.getToolbarRight();
  if (toolbarRight) {
    toolbarRight.innerHTML = `
      <select class="filter-select" id="cfo-status-filter" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
    `;
    document.getElementById('cfo-status-filter')?.addEventListener('change', (e) => {
      const filtered = ReimbursementService.filterByStatus(allData, e.target.value);
      dataTable.setData(filtered);
    });
  }
}

// ============================================================
// Shared helpers
// ============================================================

/**
 * Mini stat card for the quick-stats strip.
 */
function miniStat(icon, label, value, color = 'blue') {
  return `
    <div class="stat-card" style="padding: var(--space-4);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);">
        <div>
          <div class="stat-card-label">${label}</div>
          <div class="stat-card-value mini-stat-value" style="font-size:1.75rem;">${value}</div>
        </div>
        <div class="stat-card-icon ${color}" style="margin:0; flex-shrink:0;">${icon}</div>
      </div>
    </div>
  `;
}

/**
 * Show approval stage progress for EMP view.
 */
function approvalStageHTML(row) {
  const steps = [
    { label: 'RM',  done: row.approvedByRM  },
    { label: 'APE', done: row.approvedByAPE },
    { label: 'CFO', done: row.approvedByCFO },
  ];
  if (row.status === STATUS.REJECTED) {
    return `<span class="text-xs text-danger">Rejected</span>`;
  }
  return `
    <div style="display:flex; gap:4px; align-items:center;">
      ${steps.map((s) => `
        <span style="
          font-size:10px; font-weight:600;
          padding: 2px 6px; border-radius: 9999px;
          background: ${s.done ? 'var(--color-success-light)' : 'var(--color-gray-100)'};
          color: ${s.done ? 'var(--color-success)' : 'var(--color-gray-400)'};
          border: 1px solid ${s.done ? 'var(--color-success-border)' : 'var(--color-gray-200)'};
        ">${s.done ? '✓' : '·'} ${s.label}</span>
      `).join('')}
    </div>
  `;
}

function clearFieldErrorInModal(fieldId) {
  const field = document.getElementById(fieldId);
  field?.classList.remove('error');
  field?.parentElement?.querySelector('.form-error')?.remove();
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
