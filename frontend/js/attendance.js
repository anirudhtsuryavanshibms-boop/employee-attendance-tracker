/**
 * EMPLOYEE ATTENDANCE TRACKER - ATTENDANCE MODULE
 * Implements 5-day cycle attendance recording strictly adhering to the user's
 * Java logic: (presentDays / 5.0) * 100 >= 75% for eligibility.
 * Supports executing via native Java runtime or directly recording into ledger.
 */

const AttendanceModule = {
  records: [],
  filtered: [],
  currentDays: ['P', 'P', 'P', 'P', 'P'], // Default all Present

  init() {
    this.bindEvents();
    this.updatePreview();
  },

  bindEvents() {
    // 5-Day selector button toggles
    document.querySelectorAll('.day-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dayIndex = parseInt(btn.getAttribute('data-day-index'), 10);
        const currentVal = this.currentDays[dayIndex];
        const nextVal = currentVal === 'P' ? 'A' : 'P';
        this.currentDays[dayIndex] = nextVal;

        btn.textContent = nextVal;
        if (nextVal === 'P') {
          btn.className = 'day-toggle-btn present';
        } else {
          btn.className = 'day-toggle-btn absent';
        }

        this.updatePreview();
      });
    });

    // Record Attendance Form Submit
    const form = document.getElementById('recordAttendanceForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleRecordSubmit(e));
    }

    // Filter events
    const search = document.getElementById('attendanceSearchInput');
    if (search) search.addEventListener('input', () => this.filterRecords());

    const statusFilter = document.getElementById('attendanceStatusFilter');
    if (statusFilter) statusFilter.addEventListener('change', () => this.filterRecords());

    // Export CSV
    const exportBtn = document.getElementById('btnExportCsv');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportToCsv());
  },

  async load() {
    try {
      // Load both employees and attendance records
      const [recRes, empRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/employees')
      ]);

      if (recRes.ok) this.records = await recRes.json();
      if (empRes.ok) {
        const employees = await empRes.json();
        this.populateEmployeeDropdown(employees);
      }

      this.filterRecords();
    } catch (err) {
      console.error('Error loading attendance module:', err);
      window.App.showToast('error', 'Network Error', 'Failed to synchronize attendance data.');
    }
  },

  populateEmployeeDropdown(employees) {
    const select = document.getElementById('attendanceEmployeeSelect');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = `<option value="">-- Choose Employee --</option>` +
      employees.map(e => `<option value="${e.id}">${e.name} (${e.id}) - ${e.department}</option>`).join('');

    if (currentVal) select.value = currentVal;
  },

  preselectEmployee(empId) {
    const select = document.getElementById('attendanceEmployeeSelect');
    if (select) {
      select.value = empId;
      // Scroll form into view
      document.getElementById('recordAttendanceCard')?.scrollIntoView({ behavior: 'smooth' });
    }
  },

  // -------------------------------------------------------------------------
  // Real-Time 5-Day Calculation Preview
  // Exactly implements the Java formula:
  // double percentage = (presentDays / 5.0) * 100;
  // if (percentage >= 75) Status: Eligible else Not Eligible
  // -------------------------------------------------------------------------
  updatePreview() {
    let presentCount = 0;
    for (let i = 0; i < 5; i++) {
      if (this.currentDays[i] === 'P') presentCount++;
    }

    const percentage = (presentCount / 5.0) * 100;
    const isEligible = percentage >= 75.0;

    const presentEl = document.getElementById('previewPresentDays');
    const percentEl = document.getElementById('previewPercentage');
    const statusEl = document.getElementById('previewStatus');

    if (presentEl) presentEl.textContent = `${presentCount} / 5 Days`;
    if (percentEl) percentEl.textContent = `${percentage.toFixed(2)}%`;
    if (statusEl) {
      statusEl.textContent = isEligible ? 'Eligible' : 'Not Eligible';
      statusEl.style.color = isEligible ? '#059669' : '#dc2626';
    }
  },

  // -------------------------------------------------------------------------
  // Handle Submit: Web Form or Native Java 27 Subprocess
  // -------------------------------------------------------------------------
  async handleRecordSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const empSelect = form.employeeId;
    const dateInput = form.cycleDate;
    const notesInput = form.notes;

    if (!empSelect.value) {
      window.App.showToast('error', 'Validation Error', 'Please select an employee.');
      empSelect.focus();
      return;
    }

    const selectedOption = empSelect.options[empSelect.selectedIndex];
    const employeeName = selectedOption.text.split(' (')[0];
    const employeeId = empSelect.value;
    const cycleDate = dateInput.value || new Date().toISOString().split('T')[0];

    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving...</span>`;

    try {
      const payload = {
        employeeId: employeeId,
        employeeName: employeeName,
        days: this.currentDays,
        date: cycleDate,
        weekLabel: `5-Day Cycle (${cycleDate})`,
        notes: notesInput.value.trim() || 'Recorded via Attendance Portal',
        source: 'Web Portal'
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record attendance');

      window.App.showToast(
        'success',
        'Attendance Recorded',
        `Logged 5-day cycle for ${data.employeeName}: ${data.presentDays}/5 Days (${data.percentage.toFixed(2)}%) - ${data.status}`
      );

      // Reset form and reload data
      this.resetCycleInputs();
      this.load();
      window.App.loadStats();

    } catch (err) {
      window.App.showToast('error', 'Execution Error', err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  },

  resetCycleInputs() {
    this.currentDays = ['P', 'P', 'P', 'P', 'P'];
    document.querySelectorAll('.day-toggle-btn').forEach(btn => {
      btn.textContent = 'P';
      btn.className = 'day-toggle-btn present';
    });
    const notesInput = document.getElementById('attendanceNotesInput');
    if (notesInput) notesInput.value = '';
    this.updatePreview();
  },

  // -------------------------------------------------------------------------
  // Filtering & Rendering Records Ledger
  // -------------------------------------------------------------------------
  filterRecords() {
    const query = (document.getElementById('attendanceSearchInput')?.value || '').toLowerCase().trim();
    const status = document.getElementById('attendanceStatusFilter')?.value || '';

    this.filtered = this.records.filter(rec => {
      const matchesQuery = !query ||
        rec.employeeName.toLowerCase().includes(query) ||
        rec.employeeId.toLowerCase().includes(query) ||
        (rec.department && rec.department.toLowerCase().includes(query)) ||
        rec.id.toLowerCase().includes(query);

      const matchesStatus = !status || rec.status === status;

      return matchesQuery && matchesStatus;
    });

    this.render();
  },

  render() {
    const tbody = document.getElementById('attendanceTableBody');
    const badge = document.getElementById('attendanceTotalBadge');
    if (badge) badge.textContent = `${this.filtered.length} Records`;

    if (!tbody) return;

    if (this.filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h4>No attendance records found</h4>
              <p>No matching 5-day cycle attendance records match your query.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filtered.map(rec => {
      const isEligible = rec.status === 'Eligible';
      const badgeClass = isEligible ? 'badge-eligible' : 'badge-not-eligible';
      const initials = rec.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      const daysChips = rec.days.map(d => {
        const cls = d === 'P' ? 'p' : 'a';
        return `<span class="day-chip ${cls}">${d}</span>`;
      }).join('');

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-avatar">${initials}</div>
              <div class="user-name-box">
                <h5>${rec.employeeName}</h5>
                <span>${rec.employeeId} &bull; ${rec.department}</span>
              </div>
            </div>
          </td>
          <td><span class="days-pill-group">${daysChips}</span></td>
          <td><strong>${rec.presentDays} / 5</strong></td>
          <td><strong>${(rec.percentage || 0).toFixed(2)}%</strong></td>
          <td><span class="badge-pill ${badgeClass}">${rec.status}</span></td>
          <td>
            <span style="font-size: 12.5px; color: #64748b;">${rec.date}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm btn-icon" style="color: #ef4444;" title="Delete Record" onclick="AttendanceModule.deleteRecord('${rec.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async deleteRecord(recId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      const res = await fetch(`/api/attendance/${recId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      window.App.showToast('info', 'Record Deleted', 'The attendance entry was removed.');
      this.load();
      window.App.loadStats();
    } catch (err) {
      window.App.showToast('error', 'Delete Failed', err.message);
    }
  },

  // -------------------------------------------------------------------------
  // Export CSV Report
  // -------------------------------------------------------------------------
  exportToCsv() {
    if (this.records.length === 0) {
      window.App.showToast('warning', 'No Records', 'There are no attendance records to export.');
      return;
    }

    const headers = ['Record ID', 'Employee ID', 'Employee Name', 'Department', 'Date', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Present Days', 'Percentage', 'Status', 'Source'];
    const rows = this.records.map(r => [
      r.id,
      r.employeeId,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      r.date,
      r.days[0],
      r.days[1],
      r.days[2],
      r.days[3],
      r.days[4],
      r.presentDays,
      r.percentage.toFixed(2),
      r.status,
      `"${r.source}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employee_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.App.showToast('success', 'Export Complete', 'Attendance ledger CSV downloaded.');
  }
};

window.AttendanceModule = AttendanceModule;
document.addEventListener('DOMContentLoaded', () => AttendanceModule.init());
