/**
 * EMPLOYEE ATTENDANCE TRACKER - JAVA DEVELOPER TERMINAL MODULE
 * Provides authentic VS Code style developer terminal with live interactive
 * Scanner input/output streaming over WebSocket, syntax-highlighted source viewer,
 * and compiler verification.
 */

const TerminalModule = {
  socket: null,
  activeTab: 'console', // 'console' | 'source'
  isRunning: false,
  sourceCode: '',
  telemetry: {
    status: 'READY',
    exitCode: null,
    durationMs: null,
    runtime: 'Java(TM) SE 27'
  },

  init() {
    this.bindEvents();
    this.connectWebSocket();
  },

  bindEvents() {
    // Tab switching inside terminal panel
    document.querySelectorAll('[data-terminal-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-terminal-tab');
        this.switchTab(target);
      });
    });

    // Run / Compile / Clear buttons
    document.getElementById('btnRunProgram')?.addEventListener('click', () => this.startExecution());
    document.getElementById('btnCompileJava')?.addEventListener('click', () => this.compileJava());
    document.getElementById('btnClearConsole')?.addEventListener('click', () => this.clearConsole());
    document.getElementById('btnKillProgram')?.addEventListener('click', () => this.killProcess());

    // Interactive Input Submit
    const inputForm = document.getElementById('terminalInputForm');
    if (inputForm) {
      inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendInputFromBar();
      });
    }

    // Presets
    document.querySelectorAll('[data-demo-preset]').forEach(card => {
      card.addEventListener('click', () => {
        const presetKey = card.getAttribute('data-demo-preset');
        this.runPreset(presetKey);
      });
    });

    const presetDropdown = document.getElementById('terminalPresetSelect');
    if (presetDropdown) {
      presetDropdown.addEventListener('change', (e) => {
        if (e.target.value) {
          this.runPreset(e.target.value);
          e.target.value = '';
        }
      });
    }

    // Copy source code button
    document.getElementById('btnCopySource')?.addEventListener('click', () => this.copySourceCode());
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('[data-terminal-tab]').forEach(t => {
      if (t.getAttribute('data-terminal-tab') === tabName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    document.getElementById('terminalTabConsole')?.classList.toggle('active', tabName === 'console');
    document.getElementById('terminalTabSource')?.classList.toggle('active', tabName === 'source');

    if (tabName === 'source' && !this.sourceCode) {
      this.loadSourceCode();
    }
  },

  // -------------------------------------------------------------------------
  // WebSocket Connection
  // -------------------------------------------------------------------------
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.updateStatus('READY');
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleSocketMessage(msg);
        } catch (e) {
          this.appendConsoleRaw(event.data);
        }
      };

      this.socket.onclose = () => {
        this.updateStatus('DISCONNECTED');
        // Auto-reconnect attempt after 3s
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.socket.onerror = (err) => {
        console.warn('Terminal WebSocket error, falling back to REST runner:', err);
      };
    } catch (e) {
      console.warn('WebSocket init exception:', e);
    }
  },

  handleSocketMessage(msg) {
    if (msg.type === 'STDOUT') {
      this.appendConsoleRaw(msg.data);
      this.highlightOutputPatterns(msg.data);
    } else if (msg.type === 'STDERR') {
      this.appendConsoleRaw(msg.data, 'console-danger');
    } else if (msg.type === 'EXIT') {
      this.isRunning = false;
      this.toggleInputBar(false);
      this.updateStatus('COMPLETED', msg.code);
      if (msg.data) this.appendConsoleRaw(msg.data);
      document.getElementById('btnRunProgram').disabled = false;
      document.getElementById('btnKillProgram').style.display = 'none';
    } else if (msg.type === 'SYSTEM') {
      this.appendConsoleRaw(msg.data, 'console-system');
    }
  },

  // -------------------------------------------------------------------------
  // Java Source Code Viewer
  // -------------------------------------------------------------------------
  async loadSourceCode() {
    try {
      const res = await fetch('/api/java/source');
      if (!res.ok) throw new Error('Failed to load Java source file');
      const data = await res.json();
      this.sourceCode = data.sourceCode;

      const codeContainer = document.getElementById('sourceCodeContent');
      const lineNumbersContainer = document.getElementById('sourceCodeLineNumbers');

      if (codeContainer && lineNumbersContainer) {
        const lines = data.sourceCode.split('\n');
        lineNumbersContainer.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
        codeContainer.innerHTML = this.highlightJavaSyntax(data.sourceCode);
      }
    } catch (err) {
      console.error('Error loading Java source:', err);
    }
  },

  highlightJavaSyntax(code) {
    // Clean, readable syntax highlighting for the original code
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      // Keywords
      .replace(/\b(import|class|public|static|void|double|int|char|new|if|else|for|continue|package)\b/g, '<span class="code-keyword">$1</span>')
      // Types
      .replace(/\b(Scanner|String|System)\b/g, '<span class="code-type">$1</span>')
      // Strings
      .replace(/(".*?")/g, '<span class="code-string">$1</span>')
      // Characters
      .replace(/('.*?')/g, '<span class="code-string">$1</span>')
      // Numbers
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="code-number">$1</span>')
      // Methods
      .replace(/\b(println|print|printf|nextLine|next|toUpperCase|charAt|close)\b/g, '<span class="code-method">$1</span>');
  },

  copySourceCode() {
    if (!this.sourceCode) return;
    navigator.clipboard.writeText(this.sourceCode).then(() => {
      window.App.showToast('success', 'Copied', 'Java source code copied to clipboard.');
    });
  },

  // -------------------------------------------------------------------------
  // Execution Control: Compile & Run
  // -------------------------------------------------------------------------
  async compileJava() {
    this.switchTab('console');
    this.appendConsoleRaw('\r\n\x1b[36m$ javac backend/src/original/EmployeeAttendance.java\x1b[0m\r\n');
    this.updateStatus('COMPILING');

    try {
      const res = await fetch('/api/java/compile', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        this.appendConsoleRaw(`\x1b[32m[SUCCESS] ${data.message}\x1b[0m\r\n`);
        this.updateStatus('READY', 0);
        window.App.showToast('success', 'Compiler Output', 'Original Java code compiled successfully.');
      } else {
        this.appendConsoleRaw(`\x1b[31m[COMPILATION ERROR]\r\n${data.stderr || data.stdout}\x1b[0m\r\n`, 'console-danger');
        this.updateStatus('ERROR', data.exitCode);
        window.App.showToast('error', 'Compilation Error', 'Check terminal output for details.');
      }
    } catch (err) {
      this.appendConsoleRaw(`\x1b[31m[Network Error] ${err.message}\x1b[0m\r\n`, 'console-danger');
      this.updateStatus('ERROR', 1);
    }
  },

  startExecution() {
    this.switchTab('console');
    this.clearConsole();

    this.isRunning = true;
    this.updateStatus('RUNNING');
    this.toggleInputBar(true);

    document.getElementById('btnRunProgram').disabled = true;
    document.getElementById('btnKillProgram').style.display = 'inline-flex';

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'START' }));
    } else {
      // Fallback: If WebSocket not connected, prompt user or execute REST runner
      this.appendConsoleRaw('\x1b[33m[Notice] WebSocket connecting or offline. Initializing...\x1b[0m\r\n');
      this.connectWebSocket();
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'START' }));
        }
      }, 500);
    }
  },

  killProcess() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'KILL' }));
    }
    this.isRunning = false;
    this.toggleInputBar(false);
    this.updateStatus('TERMINATED');
    document.getElementById('btnRunProgram').disabled = false;
    document.getElementById('btnKillProgram').style.display = 'none';
  },

  // -------------------------------------------------------------------------
  // Interactive Terminal Input
  // -------------------------------------------------------------------------
  sendInputFromBar() {
    const inputEl = document.getElementById('cliTerminalInput');
    if (!inputEl) return;
    const text = inputEl.value;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'INPUT', data: text }));
      // Echo to console
      this.appendConsoleRaw(`${text}\r\n`, 'console-input-echo');
      inputEl.value = '';
    } else {
      window.App.showToast('error', 'Process Offline', 'No active Java session connected.');
    }
  },

  toggleInputBar(show) {
    const bar = document.getElementById('consoleInputBar');
    const input = document.getElementById('cliTerminalInput');
    if (bar) {
      bar.style.display = show ? 'flex' : 'none';
      if (show && input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Presets & Demonstration Scenarios
  // -------------------------------------------------------------------------
  async runPreset(presetKey) {
    this.switchTab('console');
    this.clearConsole();

    const presets = {
      preset_eligible_100: {
        title: 'Perfect Attendance (100% Eligible)',
        name: 'Alice Johnson',
        days: ['P', 'P', 'P', 'P', 'P']
      },
      preset_eligible_80: {
        title: 'Standard Eligible (80% Eligible)',
        name: 'Bob Martinez',
        days: ['P', 'P', 'P', 'A', 'P']
      },
      preset_not_eligible_60: {
        title: 'Below Threshold (60% Not Eligible)',
        name: 'Charlie Davis',
        days: ['P', 'A', 'P', 'A', 'P']
      },
      preset_invalid_input: {
        title: 'Input Validation Test (Invalid Input Check)',
        rawInput: 'David Miller\nX\nP\nP\nP\nA\nP\n'
      }
    };

    const p = presets[presetKey];
    if (!p) return;

    this.appendConsoleRaw(`\x1b[36m=== Demonstration Test: ${p.title} ===\x1b[0m\r\n`);
    this.appendConsoleRaw(`\x1b[90mExecuting native Java process with simulated stdin stream...\x1b[0m\r\n\r\n`);

    this.updateStatus('RUNNING');
    const startTime = performance.now();

    try {
      const payload = p.rawInput
        ? { rawInput: p.rawInput }
        : { name: p.name, days: p.days };

      const res = await fetch('/api/java/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);

      if (data.stdout) {
        this.appendConsoleRaw(data.stdout);
      }
      if (data.stderr) {
        this.appendConsoleRaw(data.stderr, 'console-danger');
      }

      this.appendConsoleRaw(`\r\n\x1b[32m✔ Process exited with code ${data.exitCode} in ${data.executionTimeMs || elapsed}ms\x1b[0m\r\n`);
      this.updateStatus('COMPLETED', data.exitCode, data.executionTimeMs || elapsed);

      if (data.parsedResult && data.parsedResult.status) {
        window.App.showToast(
          data.parsedResult.status === 'Eligible' ? 'success' : 'warning',
          `Java Program Result: ${data.parsedResult.status}`,
          `Employee: ${data.parsedResult.employeeName} | Present: ${data.parsedResult.presentDays}/5 | Attendance: ${data.parsedResult.percentage.toFixed(2)}%`
        );
      }
    } catch (err) {
      this.appendConsoleRaw(`\r\n\x1b[31m[Execution Error] ${err.message}\x1b[0m\r\n`, 'console-danger');
      this.updateStatus('ERROR', 1);
    }
  },

  // -------------------------------------------------------------------------
  // Console Display Helpers
  // -------------------------------------------------------------------------
  appendConsoleRaw(text, customClass = '') {
    const stream = document.getElementById('consoleOutputStream');
    if (!stream) return;

    // Convert ANSI color codes to HTML spans
    const html = this.ansiToHtml(text, customClass);
    stream.innerHTML += html;

    // Auto-scroll to bottom
    const wrapper = document.getElementById('consoleWrapper');
    if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
  },

  ansiToHtml(text, defaultClass = '') {
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Basic ANSI color translation
    formatted = formatted
      .replace(/\x1b\[31m([\s\S]*?)\x1b\[0m/g, '<span class="console-danger">$1</span>')
      .replace(/\x1b\[32m([\s\S]*?)\x1b\[0m/g, '<span class="console-success">$1</span>')
      .replace(/\x1b\[33m([\s\S]*?)\x1b\[0m/g, '<span class="console-warning">$1</span>')
      .replace(/\x1b\[36m([\s\S]*?)\x1b\[0m/g, '<span class="console-prompt-badge">$1</span>')
      .replace(/\x1b\[90m([\s\S]*?)\x1b\[0m/g, '<span class="console-system">$1</span>');

    if (defaultClass) {
      return `<span class="${defaultClass}">${formatted}</span>`;
    }
    return formatted;
  },

  highlightOutputPatterns(text) {
    // If output is prompting for input, trigger subtle visual focus
    if (text.includes('Enter employee name:') || text.includes('Day ')) {
      const input = document.getElementById('cliTerminalInput');
      if (input) input.focus();
    }
  },

  clearConsole() {
    const stream = document.getElementById('consoleOutputStream');
    if (stream) stream.innerHTML = '';
  },

  updateStatus(status, exitCode = null, durationMs = null) {
    this.telemetry.status = status;
    const badge = document.getElementById('terminalStatusBadge');
    const exitCodeEl = document.getElementById('terminalExitCode');
    const durationEl = document.getElementById('terminalDuration');

    if (badge) {
      badge.className = `status-badge ${status.toLowerCase()}`;
      badge.textContent = status;
    }

    if (exitCodeEl) {
      exitCodeEl.textContent = exitCode !== null ? `Exit: ${exitCode}` : 'Exit: --';
    }

    if (durationEl && durationMs !== null) {
      durationEl.textContent = `${durationMs}ms`;
    }
  }
};

window.TerminalModule = TerminalModule;
document.addEventListener('DOMContentLoaded', () => TerminalModule.init());
