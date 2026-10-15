/**
 * EMPLOYEE ATTENDANCE TRACKER - MASTER APP CONTROLLER
 * Handles view routing, global state, telemetry, toast alerts, modals,
 * and dashboard analytics charts.
 */

const App = {
  state: {
    currentView: 'dashboard',
    stats: null,
    charts: {
      complianceChart: null,
      departmentChart: null
    }
  },

  init() {
    this.bindNavigation();
    this.bindMobileMenu();
    this.loadStats();
    
    // Check initial hash route or default to dashboard
    const initialHash = window.location.hash.replace('#', '');
    if (['dashboard', 'employees', 'attendance'].includes(initialHash)) {
      this.navigateTo(initialHash);
    } else {
      this.navigateTo('dashboard');
    }

    // Telemetry ping
    this.checkHealth();
  },

  // -------------------------------------------------------------------------
  // Navigation & Routing
  // -------------------------------------------------------------------------
  bindNavigation() {
    document.querySelectorAll('[data-view-target]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = elem.getAttribute('data-view-target');
        this.navigateTo(targetView);
      });
    });

    window.addEventListener('popstate', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(hash, false);
    });
  },

  bindMobileMenu() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('appSidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !mobileBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  navigateTo(viewId, updateHistory = true) {
    if (!document.getElementById(`view-${viewId}`)) return;

    this.state.currentView = viewId;

    // Update active navigation item
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view-target') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle view containers
    document.querySelectorAll('.view-container').forEach(view => {
      view.classList.remove('active');
    });
    const targetEl = document.getElementById(`view-${viewId}`);
    if (targetEl) targetEl.classList.add('active');

    // Update Header Title
    const headerTitle = document.getElementById('headerPageTitle');
    const headerSubtitle = document.getElementById('headerPageSubtitle');
    const titles = {
      dashboard: { title: 'Attendance Dashboard', sub: 'Real-time metrics, eligibility compliance, and activity overview' },
      employees: { title: 'Employee Directory', sub: 'Manage employee personnel records and attendance eligibility profiles' },
      attendance: { title: 'Attendance Management', sub: 'Record 5-day attendance cycles and inspect historical logs' }
    };

    if (titles[viewId] && headerTitle && headerSubtitle) {
      headerTitle.textContent = titles[viewId].title;
      headerSubtitle.textContent = titles[viewId].sub;
    }

    if (updateHistory) {
      window.history.pushState(null, '', `#${viewId}`);
    }

    // Trigger view-specific refreshes
    if (viewId === 'dashboard') {
      this.loadStats();
    } else if (viewId === 'employees' && window.EmployeesModule) {
      window.EmployeesModule.load();
    } else if (viewId === 'attendance' && window.AttendanceModule) {
      window.AttendanceModule.load();
    }

    // Close mobile menu if open
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');
  },

  // -------------------------------------------------------------------------
  // Dashboard Metrics & Charts
  // -------------------------------------------------------------------------
  async loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      this.state.stats = data;

      // Update metric cards
      document.getElementById('metricTotalEmployees').textContent = data.totalEmployees || 0;
      document.getElementById('metricTotalRecords').textContent = data.totalRecords || 0;
      document.getElementById('metricAvgRate').textContent = `${(data.avgAttendance || 0).toFixed(1)}%`;
      document.getElementById('metricEligibleCount').textContent = data.eligibleCount || 0;
      document.getElementById('metricEligibleRate').textContent = `${(data.eligibleRate || 0).toFixed(1)}% Compliance`;
      document.getElementById('metricNotEligibleCount').textContent = data.notEligibleCount || 0;

      // Render Charts
      this.renderCharts(data);

      // Render Recent Activity Table
      this.renderRecentTable(data.recentRecords || []);

    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    }
  },

  renderCharts(stats) {
    if (typeof Chart === 'undefined') return;

    // 1. Eligibility Compliance Ratio (Doughnut)
    const complianceCanvas = document.getElementById('complianceChart');
    if (complianceCanvas) {
      if (this.state.charts.complianceChart) {
        this.state.charts.complianceChart.destroy();
      }

      const eligible = stats.eligibleCount || 0;
      const notEligible = stats.notEligibleCount || 0;

      this.state.charts.complianceChart = new Chart(complianceCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Eligible (≥ 75%)', 'Not Eligible (< 75%)'],
          datasets: [{
            data: [eligible, notEligible],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 14,
                font: { family: 'Inter', size: 12 }
              }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 2. Department Attendance Average (Bar)
    const deptCanvas = document.getElementById('departmentChart');
    if (deptCanvas && stats.departmentBreakdown) {
      if (this.state.charts.departmentChart) {
        this.state.charts.departmentChart.destroy();
      }

      const labels = stats.departmentBreakdown.map(d => d.department);
      const values = stats.departmentBreakdown.map(d => d.avgPercentage);

      this.state.charts.departmentChart = new Chart(deptCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Average Attendance (%)',
            data: values,
            backgroundColor: '#3b82f6',
            borderRadius: 6,
            maxBarThickness: 36
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: '#f1f5f9' },
              ticks: {
                callback: (val) => `${val}%`,
                font: { family: 'Inter', size: 11 }
              }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 } }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  },

  renderRecentTable(records) {
    const tbody = document.getElementById('dashboardRecentTableBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8;">No attendance records found yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(rec => {
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
          <td><strong>${rec.presentDays} / 5</strong> Days</td>
          <td><strong>${(rec.percentage || 0).toFixed(2)}%</strong></td>
          <td><span class="badge-pill ${badgeClass}">${rec.status}</span></td>
          <td style="font-size: 12px; color: #64748b;">${rec.date}</td>
        </tr>
      `;
    }).join('');
  },

  // -------------------------------------------------------------------------
  // Health & System Status
  // -------------------------------------------------------------------------
  async checkHealth() {
    try {
      const res = await fetch('/api/java/source');
      if (res.ok) {
        const dot = document.getElementById('engineStatusDot');
        const text = document.getElementById('engineStatusText');
        if (dot && text) {
          dot.style.backgroundColor = '#10b981';
          text.textContent = 'System Online';
        }
      }
    } catch (err) {
      console.warn('Health ping failed:', err);
    }
  },

  // -------------------------------------------------------------------------
  // Toast Alert Notification System
  // -------------------------------------------------------------------------
  showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  },

  // -------------------------------------------------------------------------
  // Modal Utilities
  // -------------------------------------------------------------------------
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
