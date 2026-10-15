/**
 * EMPLOYEE ATTENDANCE TRACKER - EMPLOYEES MODULE
 * Handles Employee directory list, search, filters, CRUD modals, and validation.
 */

const EmployeesModule = {
  employees: [],
  filtered: [],
  selectedEmployee: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const searchInput = document.getElementById('employeeSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterEmployees());
    }

    const deptFilter = document.getElementById('employeeDeptFilter');
    if (deptFilter) {
      deptFilter.addEventListener('change', () => this.filterEmployees());
    }

    const statusFilter = document.getElementById('employeeStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterEmployees());
    }

    // Add Employee Form
    const addForm = document.getElementById('addEmployeeForm');
    if (addForm) {
      addForm.addEventListener('submit', (e) => this.handleAddSubmit(e));
    }

    // Edit Employee Form
    const editForm = document.getElementById('editEmployeeForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
    }
  },

  async load() {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to load employees');
      this.employees = await res.json();
      this.filterEmployees();
      this.populateDeptFilter();
    } catch (err) {
      console.error('Error loading employees:', err);
      window.App.showToast('error', 'Data Error', 'Unable to fetch employees from backend.');
    }
  },

  populateDeptFilter() {
    const deptSelect = document.getElementById('employeeDeptFilter');
    if (!deptSelect) return;

    const currentVal = deptSelect.value;
    const depts = [...new Set(this.employees.map(e => e.department).filter(Boolean))].sort();

    deptSelect.innerHTML = `<option value="">All Departments</option>` +
      depts.map(d => `<option value="${d}">${d}</option>`).join('');

    deptSelect.value = currentVal;
  },

  filterEmployees() {
    const query = (document.getElementById('employeeSearchInput')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('employeeDeptFilter')?.value || '';
    const status = document.getElementById('employeeStatusFilter')?.value || '';

    this.filtered = this.employees.filter(emp => {
      const matchesQuery = !query ||
        emp.name.toLowerCase().includes(query) ||
        emp.id.toLowerCase().includes(query) ||
        (emp.designation && emp.designation.toLowerCase().includes(query)) ||
        (emp.email && emp.email.toLowerCase().includes(query));

      const matchesDept = !dept || emp.department === dept;

      const matchesStatus = !status ||
        (status === 'Eligible' && emp.latestStatus === 'Eligible') ||
        (status === 'Not Eligible' && emp.latestStatus === 'Not Eligible') ||
        (status === 'No Records' && emp.latestStatus === 'No Records');

      return matchesQuery && matchesDept && matchesStatus;
    });

    this.render();
  },

  render() {
    const tbody = document.getElementById('employeesTableBody');
    const countBadge = document.getElementById('employeeTotalBadge');
    if (countBadge) countBadge.textContent = `${this.filtered.length} Employees`;

    if (!tbody) return;

    if (this.filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </div>
              <h4>No employees found</h4>
              <p>No matching employee profiles match your search criteria or filters.</p>
              <button class="btn btn-secondary btn-sm" onclick="EmployeesModule.resetFilters()">Reset Filters</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtered.map(emp => {
      const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      let statusBadge = `<span class="badge-pill badge-neutral">No Records</span>`;
      if (emp.latestStatus === 'Eligible') {
        statusBadge = `<span class="badge-pill badge-eligible">Eligible (≥75%)</span>`;
      } else if (emp.latestStatus === 'Not Eligible') {
        statusBadge = `<span class="badge-pill badge-not-eligible">Not Eligible</span>`;
      }

      const attendanceDisplay = emp.latestPercentage !== null
        ? `<strong>${emp.latestPercentage.toFixed(2)}%</strong>`
        : `<span style="color:#94a3b8;">--</span>`;

      return `
        <tr>
          <td><span class="badge-pill badge-neutral" style="font-family: var(--font-mono);">${emp.id}</span></td>
          <td>
            <div class="user-cell">
              <div class="user-avatar">${initials}</div>
              <div class="user-name-box">
                <h5>${emp.name}</h5>
                <span>${emp.email || '--'}</span>
              </div>
            </div>
          </td>
          <td><span class="badge-pill badge-primary">${emp.department}</span></td>
          <td>${emp.designation || 'Staff'}</td>
          <td>${attendanceDisplay}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-secondary btn-sm btn-icon" title="View Profile" onclick="EmployeesModule.viewDetails('${emp.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm btn-icon" title="Record Attendance" onclick="EmployeesModule.quickAttendance('${emp.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm btn-icon" title="Edit Employee" onclick="EmployeesModule.openEditModal('${emp.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm btn-icon" title="Delete Employee" style="color:#ef4444;" onclick="EmployeesModule.confirmDelete('${emp.id}', '${emp.name.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  resetFilters() {
    const searchInput = document.getElementById('employeeSearchInput');
    const deptFilter = document.getElementById('employeeDeptFilter');
    const statusFilter = document.getElementById('employeeStatusFilter');
    if (searchInput) searchInput.value = '';
    if (deptFilter) deptFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    this.filterEmployees();
  },

  // -------------------------------------------------------------------------
  // Add Employee Form Validation & Submit
  // -------------------------------------------------------------------------
  async handleAddSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const nameInput = form.name;
    const deptInput = form.department;
    const emailInput = form.email;
    const phoneInput = form.phone;
    const desigInput = form.designation;

    // Validation
    let valid = true;
    if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
      this.setFieldError(nameInput, 'Full Name is required (minimum 2 characters)');
      valid = false;
    } else {
      this.clearFieldError(nameInput);
    }

    if (!deptInput.value.trim()) {
      this.setFieldError(deptInput, 'Please select or enter a department');
      valid = false;
    } else {
      this.clearFieldError(deptInput);
    }

    if (emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      this.setFieldError(emailInput, 'Please enter a valid email format');
      valid = false;
    } else {
      this.clearFieldError(emailInput);
    }

    if (!valid) return;

    try {
      const payload = {
        name: nameInput.value.trim(),
        department: deptInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        designation: desigInput.value.trim()
      };

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add employee');

      window.App.showToast('success', 'Employee Added', `Employee ${data.name} (${data.id}) registered successfully.`);
      window.App.closeModal('addEmployeeModal');
      form.reset();
      this.load();
      window.App.loadStats();
    } catch (err) {
      window.App.showToast('error', 'Registration Failed', err.message);
    }
  },

  // -------------------------------------------------------------------------
  // Edit Employee
  // -------------------------------------------------------------------------
  openEditModal(empId) {
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;

    const form = document.getElementById('editEmployeeForm');
    if (!form) return;

    form.empId.value = emp.id;
    form.name.value = emp.name;
    form.department.value = emp.department;
    form.designation.value = emp.designation || '';
    form.email.value = emp.email || '';
    form.phone.value = emp.phone || '';

    window.App.openModal('editEmployeeModal');
  },

  async handleEditSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value;

    const payload = {
      name: form.name.value.trim(),
      department: form.department.value.trim(),
      designation: form.designation.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim()
    };

    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update employee');

      window.App.showToast('success', 'Employee Updated', `Changes to ${data.name} saved.`);
      window.App.closeModal('editEmployeeModal');
      this.load();
      window.App.loadStats();
    } catch (err) {
      window.App.showToast('error', 'Update Failed', err.message);
    }
  },

  // -------------------------------------------------------------------------
  // Delete Employee
  // -------------------------------------------------------------------------
  confirmDelete(empId, name) {
    if (confirm(`Are you sure you want to delete employee "${name}" (${empId})? All associated attendance records will also be removed.`)) {
      this.deleteEmployee(empId);
    }
  },

  async deleteEmployee(empId) {
    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      window.App.showToast('info', 'Employee Removed', data.message);
      this.load();
      window.App.loadStats();
    } catch (err) {
      window.App.showToast('error', 'Delete Failed', err.message);
    }
  },

  // -------------------------------------------------------------------------
  // View Details Drawer / Modal
  // -------------------------------------------------------------------------
  viewDetails(empId) {
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById('viewEmpName').textContent = emp.name;
    document.getElementById('viewEmpId').textContent = emp.id;
    document.getElementById('viewEmpDept').textContent = emp.department;
    document.getElementById('viewEmpDesignation').textContent = emp.designation || 'Staff';
    document.getElementById('viewEmpEmail').textContent = emp.email || '--';
    document.getElementById('viewEmpPhone').textContent = emp.phone || '--';
    document.getElementById('viewEmpJoining').textContent = emp.joiningDate || '--';

    const statusEl = document.getElementById('viewEmpStatus');
    if (statusEl) {
      if (emp.latestStatus === 'Eligible') {
        statusEl.className = 'badge-pill badge-eligible';
        statusEl.textContent = 'Eligible (≥75%)';
      } else if (emp.latestStatus === 'Not Eligible') {
        statusEl.className = 'badge-pill badge-not-eligible';
        statusEl.textContent = 'Not Eligible (<75%)';
      } else {
        statusEl.className = 'badge-pill badge-neutral';
        statusEl.textContent = 'No Records Recorded';
      }
    }

    window.App.openModal('viewEmployeeModal');
  },

  quickAttendance(empId) {
    window.App.navigateTo('attendance');
    setTimeout(() => {
      if (window.AttendanceModule) {
        window.AttendanceModule.preselectEmployee(empId);
      }
    }, 100);
  },

  setFieldError(inputEl, msg) {
    const group = inputEl.closest('.form-group');
    if (group) {
      group.classList.add('has-error');
      let errEl = group.querySelector('.form-error');
      if (errEl) errEl.textContent = msg;
    }
  },

  clearFieldError(inputEl) {
    const group = inputEl.closest('.form-group');
    if (group) {
      group.classList.remove('has-error');
    }
  }
};

window.EmployeesModule = EmployeesModule;
document.addEventListener('DOMContentLoaded', () => EmployeesModule.init());
