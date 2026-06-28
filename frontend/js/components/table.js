/**
 * table.js
 * Reusable DataTable component with:
 *  - Client-side sorting
 *  - Debounced search
 *  - Pagination
 *  - Column definitions
 *  - Custom cell renderers
 *  - Empty state
 *
 * Usage:
 *   import DataTable from '../components/table.js';
 *
 *   const table = new DataTable({
 *     containerId: 'employees-table-container',
 *     columns: [
 *       { key: 'name',   label: 'Name',   sortable: true, render: (val, row) => `...` },
 *       { key: 'email',  label: 'Email',  sortable: true },
 *       { key: 'role',   label: 'Role',   sortable: false, render: (val) => renderBadge(val) },
 *       { key: 'actions',label: 'Actions',sortable: false, render: (_, row) => `...` },
 *     ],
 *     data: [],          // will be set via table.setData(rows)
 *     pageSize: 10,
 *     searchable: true,
 *     emptyTitle: 'No employees found',
 *     emptyDesc: 'Assign employees to see them here.',
 *   });
 *
 *   table.setData(rows);  // update data and re-render
 *   table.refresh();      // re-render current data
 */

export default class DataTable {
  /**
   * @param {Object}   opts
   * @param {string}   opts.containerId   — ID of the wrapper element
   * @param {Array}    opts.columns        — column definitions
   * @param {Array}    [opts.data=[]]      — initial data rows
   * @param {number}   [opts.pageSize=10]
   * @param {boolean}  [opts.searchable=true]
   * @param {string}   [opts.emptyTitle='No data found']
   * @param {string}   [opts.emptyDesc='']
   */
  constructor({
    containerId,
    columns,
    data       = [],
    pageSize   = 10,
    searchable = true,
    emptyTitle = 'No results found',
    emptyDesc  = 'Try adjusting your search or filters.',
  }) {
    this._container   = document.getElementById(containerId);
    this._columns     = columns;
    this._allData     = data;
    this._filtered    = data;
    this._pageSize    = pageSize;
    this._currentPage = 1;
    this._sortKey     = null;
    this._sortDir     = 'asc';   // 'asc' | 'desc'
    this._searchQuery = '';
    this._searchable  = searchable;
    this._emptyTitle  = emptyTitle;
    this._emptyDesc   = emptyDesc;
    this._searchDebounce = null;

    if (!this._container) {
      console.warn(`DataTable: container #${containerId} not found.`);
      return;
    }

    this._render();
  }

  /* -------------------------------------------------------
     Public API
  ------------------------------------------------------- */

  /** Replace dataset and re-render from page 1 */
  setData(rows) {
    this._allData     = Array.isArray(rows) ? rows : [];
    this._currentPage = 1;
    this._applyFilters();
    this._renderBody();
    this._renderPagination();
  }

  /** Get current raw dataset */
  getData() {
    return this._allData;
  }

  /** Re-render without changing data */
  refresh() {
    this._applyFilters();
    this._renderBody();
    this._renderPagination();
  }

  /* -------------------------------------------------------
     Private: Initial render
  ------------------------------------------------------- */

  _render() {
    this._container.innerHTML = `
      ${this._searchable ? this._buildToolbar() : ''}
      <div class="table-wrapper">
        <table class="data-table" id="${this._container.id}-table">
          <thead>${this._buildHead()}</thead>
          <tbody id="${this._container.id}-tbody"></tbody>
        </table>
      </div>
      <div id="${this._container.id}-pagination"></div>
    `;

    if (this._searchable) this._attachSearchListener();
    this._attachSortListeners();
    this._applyFilters();
    this._renderBody();
    this._renderPagination();
  }

  /* -------------------------------------------------------
     Private: Toolbar (search + optional slot)
  ------------------------------------------------------- */

  _buildToolbar() {
    return `
      <div class="table-toolbar" id="${this._container.id}-toolbar">
        <div class="table-toolbar-left">
          <div class="search-box">
            <span class="search-box-icon">🔍</span>
            <input
              type="search"
              class="search-input"
              id="${this._container.id}-search"
              placeholder="Search…"
              aria-label="Search table"
            />
          </div>
        </div>
        <div class="table-toolbar-right" id="${this._container.id}-toolbar-right">
          <!-- Page controllers can inject buttons here -->
        </div>
      </div>
    `;
  }

  /** Returns the toolbar-right slot element for external buttons */
  getToolbarRight() {
    return document.getElementById(`${this._container.id}-toolbar-right`);
  }

  /* -------------------------------------------------------
     Private: Table Head
  ------------------------------------------------------- */

  _buildHead() {
    return `<tr>${this._columns.map((col) => {
      const sortable = col.sortable ? 'sortable' : '';
      const sortId = col.sortable ? `data-sort-key="${col.key}"` : '';
      return `
        <th class="${sortable}" ${sortId} id="${this._container.id}-th-${col.key}">
          ${col.label}
          ${col.sortable ? `<span class="th-sort-icon" aria-hidden="true">↕</span>` : ''}
        </th>
      `;
    }).join('')}</tr>`;
  }

  /* -------------------------------------------------------
     Private: Filtering + Sorting
  ------------------------------------------------------- */

  _applyFilters() {
    let data = [...this._allData];

    // Search across all string fields
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      );
    }

    // Sort
    if (this._sortKey) {
      data.sort((a, b) => {
        const av = String(a[this._sortKey] ?? '').toLowerCase();
        const bv = String(b[this._sortKey] ?? '').toLowerCase();
        if (av < bv) return this._sortDir === 'asc' ? -1 : 1;
        if (av > bv) return this._sortDir === 'asc' ?  1 : -1;
        return 0;
      });
    }

    this._filtered = data;
  }

  /* -------------------------------------------------------
     Private: Render body rows
  ------------------------------------------------------- */

  _renderBody() {
    const tbody = document.getElementById(`${this._container.id}-tbody`);
    if (!tbody) return;

    const start = (this._currentPage - 1) * this._pageSize;
    const slice = this._filtered.slice(start, start + this._pageSize);

    if (slice.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this._columns.length}">
            <div class="table-empty">
              <div class="table-empty-icon">📭</div>
              <div class="table-empty-title">${this._emptyTitle}</div>
              <div class="table-empty-desc">${this._emptyDesc}</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = slice.map((row, idx) => `
      <tr data-index="${start + idx}">
        ${this._columns.map((col) => {
          const cellValue = row[col.key];
          const rendered  = col.render
            ? col.render(cellValue, row, start + idx)
            : this._escape(String(cellValue ?? '—'));
          return `<td>${rendered}</td>`;
        }).join('')}
      </tr>
    `).join('');
  }

  /* -------------------------------------------------------
     Private: Pagination
  ------------------------------------------------------- */

  _renderPagination() {
    const paginationEl = document.getElementById(`${this._container.id}-pagination`);
    if (!paginationEl) return;

    const total     = this._filtered.length;
    const totalPages = Math.ceil(total / this._pageSize) || 1;
    const start     = (this._currentPage - 1) * this._pageSize + 1;
    const end       = Math.min(this._currentPage * this._pageSize, total);

    if (total === 0) {
      paginationEl.innerHTML = '';
      return;
    }

    const pages = this._buildPageNumbers(totalPages);

    paginationEl.innerHTML = `
      <div class="pagination">
        <div class="pagination-info">
          Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> results
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" id="${this._container.id}-prev"
            aria-label="Previous page" ${this._currentPage === 1 ? 'disabled' : ''}>‹</button>
          ${pages}
          <button class="pagination-btn" id="${this._container.id}-next"
            aria-label="Next page" ${this._currentPage === totalPages ? 'disabled' : ''}>›</button>
        </div>
      </div>
    `;

    this._attachPaginationListeners(totalPages);
  }

  _buildPageNumbers(totalPages) {
    const current = this._currentPage;
    const pages   = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= current - 1 && i <= current + 1)
      ) {
        pages.push(i);
      } else if (
        (i === current - 2 && i > 1) ||
        (i === current + 2 && i < totalPages)
      ) {
        pages.push('…');
      }
    }

    // Deduplicate consecutive ellipses
    return [...new Set(pages)].map((p) => {
      if (p === '…') return `<span class="pagination-ellipsis">…</span>`;
      return `
        <button class="pagination-btn ${p === current ? 'active' : ''}"
          data-page="${p}" aria-label="Page ${p}" ${p === current ? 'aria-current="page"' : ''}>
          ${p}
        </button>
      `;
    }).join('');
  }

  /* -------------------------------------------------------
     Private: Event Listeners
  ------------------------------------------------------- */

  _attachSearchListener() {
    const input = document.getElementById(`${this._container.id}-search`);
    if (!input) return;
    input.addEventListener('input', (e) => {
      clearTimeout(this._searchDebounce);
      this._searchDebounce = setTimeout(() => {
        this._searchQuery  = e.target.value.trim();
        this._currentPage  = 1;
        this._applyFilters();
        this._renderBody();
        this._renderPagination();
      }, 300); // 300ms debounce
    });
  }

  _attachSortListeners() {
    this._columns.forEach((col) => {
      if (!col.sortable) return;
      const th = document.getElementById(`${this._container.id}-th-${col.key}`);
      if (!th) return;
      th.addEventListener('click', () => {
        if (this._sortKey === col.key) {
          this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._sortKey = col.key;
          this._sortDir = 'asc';
        }
        this._updateSortIcons();
        this._applyFilters();
        this._renderBody();
        this._renderPagination();
      });
    });
  }

  _updateSortIcons() {
    this._columns.forEach((col) => {
      if (!col.sortable) return;
      const th   = document.getElementById(`${this._container.id}-th-${col.key}`);
      const icon = th?.querySelector('.th-sort-icon');
      if (!th || !icon) return;
      th.classList.remove('sort-asc', 'sort-desc');
      if (this._sortKey === col.key) {
        th.classList.add(this._sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        icon.textContent = this._sortDir === 'asc' ? '↑' : '↓';
      } else {
        icon.textContent = '↕';
      }
    });
  }

  _attachPaginationListeners(totalPages) {
    const prev = document.getElementById(`${this._container.id}-prev`);
    const next = document.getElementById(`${this._container.id}-next`);

    prev?.addEventListener('click', () => {
      if (this._currentPage > 1) {
        this._currentPage--;
        this._renderBody();
        this._renderPagination();
        this._container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    next?.addEventListener('click', () => {
      if (this._currentPage < totalPages) {
        this._currentPage++;
        this._renderBody();
        this._renderPagination();
        this._container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Page number buttons
    const paginationEl = document.getElementById(`${this._container.id}-pagination`);
    paginationEl?.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (p !== this._currentPage) {
          this._currentPage = p;
          this._renderBody();
          this._renderPagination();
        }
      });
    });
  }

  /* -------------------------------------------------------
     Utility
  ------------------------------------------------------- */

  _escape(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
}
