const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

const PORT = process.env.PORT || 3000;

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const ORIGINAL_JAVA_FILE = path.join(__dirname, 'src', 'original', 'EmployeeAttendance.java');
const JAVA_DIR = path.join(__dirname, 'src', 'original');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

// Helper: Ensure data files exist
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2));
  }
}
ensureDataFiles();

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. JAVA INTEGRATION & EXECUTION ENDPOINTS
// ---------------------------------------------------------------------------

// Read the original unmodified Java source code
app.get('/api/java/source', (req, res) => {
  try {
    if (!fs.existsSync(ORIGINAL_JAVA_FILE)) {
      return res.status(404).json({ error: 'Original Java source file not found at expected path.' });
    }
    const sourceCode = fs.readFileSync(ORIGINAL_JAVA_FILE, 'utf8');
    return res.json({
      filePath: 'backend/src/original/EmployeeAttendance.java',
      fileName: 'EmployeeAttendance.java',
      className: 'EmployeeAttendance',
      sourceCode: sourceCode
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read Java source code: ' + err.message });
  }
});

// Compile the original Java program
app.post('/api/java/compile', (req, res) => {
  if (!fs.existsSync(ORIGINAL_JAVA_FILE)) {
    return res.status(404).json({ success: false, error: 'Original Java source file not found.' });
  }

  exec(`javac "${ORIGINAL_JAVA_FILE}"`, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        exitCode: error.code || 1,
        stdout: stdout || '',
        stderr: stderr || error.message,
        message: 'Compilation failed'
      });
    }
    return res.json({
      success: true,
      exitCode: 0,
      stdout: stdout || '',
      stderr: stderr || '',
      message: 'Compilation successful! Bytecode class file generated in backend/src/original/.'
    });
  });
});

// Run the original Java program with simulated/provided inputs
app.post('/api/java/run', (req, res) => {
  const { name, days, rawInput, saveRecord, employeeId, notes } = req.body;

  // Make sure source is compiled
  if (!fs.existsSync(path.join(JAVA_DIR, 'EmployeeAttendance.class'))) {
    // Attempt auto-compilation first
    try {
      require('child_process').execSync(`javac "${ORIGINAL_JAVA_FILE}"`);
    } catch (compileErr) {
      return res.status(500).json({
        success: false,
        error: 'Failed to compile Java source before running: ' + compileErr.message
      });
    }
  }

  // Format stdin payload
  let stdinText = '';
  if (rawInput !== undefined && rawInput !== null) {
    stdinText = rawInput.endsWith('\n') ? rawInput : rawInput + '\n';
  } else if (name && Array.isArray(days)) {
    // Name + 5 days
    stdinText = `${name}\n` + days.map(d => String(d).trim().toUpperCase()).join('\n') + '\n';
  } else {
    return res.status(400).json({
      error: 'Please provide either rawInput or { name, days: ["P", ...] } to run the Java program.'
    });
  }

  const startTime = Date.now();
  const child = spawn('java', ['-cp', JAVA_DIR, 'EmployeeAttendance']);

  let stdoutData = '';
  let stderrData = '';

  child.stdout.on('data', chunk => {
    stdoutData += chunk.toString();
  });

  child.stderr.on('data', chunk => {
    stderrData += chunk.toString();
  });

  // Write stdin
  child.stdin.write(stdinText);
  child.stdin.end();

  // Handle timeout (max 8 seconds)
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, 8000);

  child.on('close', (code) => {
    clearTimeout(timer);
    const executionTimeMs = Date.now() - startTime;

    // Parse the actual stdout produced by the user's program
    // Expected patterns:
    // Employee Name: <name>
    // Present Days: <presentDays>
    // Attendance: <percentage>%
    // Status: <Eligible / Not Eligible>
    const nameMatch = stdoutData.match(/^Employee Name:\s*([^\r\n]+)/mi);
    const presentMatch = stdoutData.match(/^Present Days:\s*(\d+)/mi);
    const percentMatch = stdoutData.match(/^Attendance:\s*([\d.]+)%/mi);
    const statusMatch = stdoutData.match(/^Status:\s*([^\r\n]+)/mi);

    const parsedResult = {
      employeeName: nameMatch ? nameMatch[1].trim() : (name || null),
      presentDays: presentMatch ? parseInt(presentMatch[1], 10) : null,
      percentage: percentMatch ? parseFloat(percentMatch[1]) : null,
      status: statusMatch ? statusMatch[1].trim() : null
    };

    // If requested to save record into the attendance ledger
    let savedRecord = null;
    if (saveRecord && parsedResult.presentDays !== null && parsedResult.percentage !== null) {
      const records = readJson(ATTENDANCE_FILE);
      const employees = readJson(EMPLOYEES_FILE);
      const matchedEmp = employees.find(e => e.id === employeeId || e.name.toLowerCase() === parsedResult.employeeName.toLowerCase());

      const today = new Date().toISOString().split('T')[0];
      const newRec = {
        id: 'ATT-' + Date.now().toString().slice(-6),
        employeeId: matchedEmp ? matchedEmp.id : (employeeId || 'EMP-EXT'),
        employeeName: parsedResult.employeeName,
        department: matchedEmp ? matchedEmp.department : 'General',
        date: today,
        weekLabel: `Cycle ending ${today}`,
        days: Array.isArray(days) ? days : ['P', 'P', 'P', 'P', 'P'],
        presentDays: parsedResult.presentDays,
        percentage: parsedResult.percentage,
        status: parsedResult.status,
        source: 'Java Program Execution',
        notes: notes || 'Executed through integrated Java Runner'
      };
      records.unshift(newRec);
      writeJson(ATTENDANCE_FILE, records);
      savedRecord = newRec;
    }

    return res.json({
      success: code === 0,
      exitCode: code,
      stdout: stdoutData,
      stderr: stderrData,
      executionTimeMs,
      parsedResult,
      savedRecord
    });
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    return res.status(500).json({
      success: false,
      error: 'Failed to spawn Java process: ' + err.message
    });
  });
});

// ---------------------------------------------------------------------------
// 2. WEBSOCKET FOR REAL-TIME INTERACTIVE TERMINAL
// ---------------------------------------------------------------------------

wss.on('connection', (ws) => {
  let activeProcess = null;

  ws.send(JSON.stringify({
    type: 'SYSTEM',
    data: 'Connected to Employee Attendance Java Terminal Engine.\r\n'
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'START') {
        if (activeProcess) {
          try { activeProcess.kill(); } catch (e) {}
          activeProcess = null;
        }

        // Auto compile before starting
        try {
          exec(`javac "${ORIGINAL_JAVA_FILE}"`, (err, stdout, stderr) => {
            if (err) {
              ws.send(JSON.stringify({
                type: 'STDERR',
                data: `[Compilation Error]\r\n${stderr || err.message}\r\n`
              }));
              ws.send(JSON.stringify({ type: 'EXIT', code: 1 }));
              return;
            }

            ws.send(JSON.stringify({
              type: 'STDOUT',
              data: `\x1b[36m$ javac EmployeeAttendance.java\x1b[0m\r\n` +
                    `\x1b[32m$ java EmployeeAttendance\x1b[0m\r\n`
            }));

            activeProcess = spawn('java', ['-cp', JAVA_DIR, 'EmployeeAttendance']);

            activeProcess.stdout.on('data', chunk => {
              ws.send(JSON.stringify({ type: 'STDOUT', data: chunk.toString() }));
            });

            activeProcess.stderr.on('data', chunk => {
              ws.send(JSON.stringify({ type: 'STDERR', data: chunk.toString() }));
            });

            activeProcess.on('close', code => {
              ws.send(JSON.stringify({
                type: 'EXIT',
                code: code,
                data: `\r\n\x1b[90m[Process finished with exit code ${code}]\x1b[0m\r\n`
              }));
              activeProcess = null;
            });

            activeProcess.on('error', err => {
              ws.send(JSON.stringify({
                type: 'STDERR',
                data: `\r\n\x1b[31m[Process Error: ${err.message}]\x1b[0m\r\n`
              }));
              activeProcess = null;
            });
          });
        } catch (e) {
          ws.send(JSON.stringify({ type: 'STDERR', data: `Error initiating runner: ${e.message}\r\n` }));
        }

      } else if (msg.type === 'INPUT') {
        if (activeProcess && activeProcess.stdin && !activeProcess.stdin.destroyed) {
          const text = msg.data || '';
          activeProcess.stdin.write(text + '\n');
        } else {
          ws.send(JSON.stringify({
            type: 'STDERR',
            data: 'No active Java process currently listening for input. Click "Run Program" first.\r\n'
          }));
        }
      } else if (msg.type === 'KILL') {
        if (activeProcess) {
          activeProcess.kill('SIGTERM');
          activeProcess = null;
          ws.send(JSON.stringify({
            type: 'SYSTEM',
            data: '\r\n\x1b[33m[Execution terminated by user]\x1b[0m\r\n'
          }));
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
    }
  });

  ws.on('close', () => {
    if (activeProcess) {
      try { activeProcess.kill(); } catch (e) {}
      activeProcess = null;
    }
  });
});

// ---------------------------------------------------------------------------
// 3. EMPLOYEE MANAGEMENT ENDPOINTS
// ---------------------------------------------------------------------------

// List all employees
app.get('/api/employees', (req, res) => {
  const employees = readJson(EMPLOYEES_FILE);
  const attendance = readJson(ATTENDANCE_FILE);

  // Augment each employee with their latest attendance summary
  const enriched = employees.map(emp => {
    const records = attendance.filter(a => a.employeeId === emp.id || a.employeeName.toLowerCase() === emp.name.toLowerCase());
    const latest = records[0] || null;
    const avgPercentage = records.length > 0
      ? (records.reduce((sum, r) => sum + r.percentage, 0) / records.length).toFixed(1)
      : null;

    return {
      ...emp,
      attendanceRecordCount: records.length,
      latestStatus: latest ? latest.status : 'No Records',
      latestPercentage: latest ? latest.percentage : null,
      averagePercentage: avgPercentage ? parseFloat(avgPercentage) : null
    };
  });

  return res.json(enriched);
});

// Add new employee
app.post('/api/employees', (req, res) => {
  const { name, department, email, phone, designation, joiningDate } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Employee name is required (minimum 2 characters).' });
  }
  if (!department || department.trim().length < 2) {
    return res.status(400).json({ error: 'Department is required.' });
  }

  const employees = readJson(EMPLOYEES_FILE);

  // Check email uniqueness if email provided
  if (email && email.trim()) {
    const exists = employees.some(e => e.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'An employee with this email address already exists.' });
    }
  }

  // Generate next ID (e.g. EMP009)
  const maxNum = employees.reduce((max, e) => {
    const match = e.id && e.id.match(/^EMP(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  const newId = `EMP${String(maxNum + 1).padStart(3, '0')}`;

  const newEmployee = {
    id: newId,
    name: name.trim(),
    department: department.trim(),
    email: email ? email.trim() : `${name.trim().toLowerCase().replace(/\s+/g, '.')}@corp.com`,
    phone: phone ? phone.trim() : '--',
    designation: designation ? designation.trim() : 'Team Member',
    joiningDate: joiningDate || new Date().toISOString().split('T')[0]
  };

  employees.push(newEmployee);
  writeJson(EMPLOYEES_FILE, employees);

  return res.status(201).json(newEmployee);
});

// Update employee
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, email, phone, designation, joiningDate } = req.body;

  const employees = readJson(EMPLOYEES_FILE);
  const index = employees.findIndex(e => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found with ID: ' + id });
  }

  if (name && name.trim().length < 2) {
    return res.status(400).json({ error: 'Employee name must have at least 2 characters.' });
  }

  // If email updated, verify uniqueness
  if (email && email.trim()) {
    const conflict = employees.some(e => e.id !== id && e.email.toLowerCase() === email.trim().toLowerCase());
    if (conflict) {
      return res.status(400).json({ error: 'Another employee already uses this email.' });
    }
  }

  employees[index] = {
    ...employees[index],
    name: name ? name.trim() : employees[index].name,
    department: department ? department.trim() : employees[index].department,
    email: email ? email.trim() : employees[index].email,
    phone: phone !== undefined ? phone.trim() : employees[index].phone,
    designation: designation ? designation.trim() : employees[index].designation,
    joiningDate: joiningDate || employees[index].joiningDate
  };

  writeJson(EMPLOYEES_FILE, employees);
  return res.json(employees[index]);
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  let employees = readJson(EMPLOYEES_FILE);
  const exists = employees.some(e => e.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'Employee not found with ID: ' + id });
  }

  employees = employees.filter(e => e.id !== id);
  writeJson(EMPLOYEES_FILE, employees);

  // Also clean up or flag attendance records
  let attendance = readJson(ATTENDANCE_FILE);
  attendance = attendance.filter(a => a.employeeId !== id);
  writeJson(ATTENDANCE_FILE, attendance);

  return res.json({ success: true, message: `Employee ${id} and associated attendance records removed.` });
});

// ---------------------------------------------------------------------------
// 4. ATTENDANCE MANAGEMENT ENDPOINTS
// ---------------------------------------------------------------------------

// List attendance records
app.get('/api/attendance', (req, res) => {
  const records = readJson(ATTENDANCE_FILE);
  return res.json(records);
});

// Create new 5-day attendance record (matching original Java logic)
app.post('/api/attendance', (req, res) => {
  const { employeeId, employeeName, days, date, weekLabel, notes, source } = req.body;

  if (!employeeId && !employeeName) {
    return res.status(400).json({ error: 'Employee selection is required.' });
  }

  if (!Array.isArray(days) || days.length !== 5) {
    return res.status(400).json({ error: 'Attendance must contain exactly 5 days (Day 1 through Day 5).' });
  }

  // Validate each day is strictly 'P' or 'A'
  const normalizedDays = [];
  let presentDays = 0;

  for (let i = 0; i < 5; i++) {
    const val = String(days[i] || '').trim().toUpperCase();
    if (val !== 'P' && val !== 'A') {
      return res.status(400).json({
        error: `Invalid input for Day ${i + 1}! Enter only 'P' (Present) or 'A' (Absent).`
      });
    }
    normalizedDays.push(val);
    if (val === 'P') {
      presentDays++;
    }
  }

  // Exact logic from user's Java program:
  // double percentage = (presentDays / 5.0) * 100;
  // if (percentage >= 75) Status: Eligible else Not Eligible
  const percentage = (presentDays / 5.0) * 100;
  const status = percentage >= 75 ? 'Eligible' : 'Not Eligible';

  const employees = readJson(EMPLOYEES_FILE);
  const emp = employees.find(e => e.id === employeeId || e.name.toLowerCase() === (employeeName || '').toLowerCase());

  const resolvedName = emp ? emp.name : (employeeName || 'Unknown Employee');
  const resolvedDept = emp ? emp.department : 'General';
  const resolvedId = emp ? emp.id : (employeeId || 'EMP-MANUAL');

  const todayStr = date || new Date().toISOString().split('T')[0];

  const newRecord = {
    id: 'ATT-' + Date.now().toString().slice(-6),
    employeeId: resolvedId,
    employeeName: resolvedName,
    department: resolvedDept,
    date: todayStr,
    weekLabel: weekLabel || `5-Day Cycle (${todayStr})`,
    days: normalizedDays,
    presentDays: presentDays,
    percentage: parseFloat(percentage.toFixed(2)),
    status: status,
    source: source || 'Web Attendance Portal',
    notes: notes || `Recorded with ${presentDays}/5 present days (${percentage.toFixed(2)}%)`
  };

  const records = readJson(ATTENDANCE_FILE);
  records.unshift(newRecord);
  writeJson(ATTENDANCE_FILE, records);

  return res.status(201).json(newRecord);
});

// Delete attendance record
app.delete('/api/attendance/:id', (req, res) => {
  const { id } = req.params;
  let records = readJson(ATTENDANCE_FILE);
  const initialLength = records.length;
  records = records.filter(r => r.id !== id);

  if (records.length === initialLength) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  writeJson(ATTENDANCE_FILE, records);
  return res.json({ success: true, message: 'Attendance record deleted.' });
});

// ---------------------------------------------------------------------------
// 5. STATS & ANALYTICS ENDPOINT
// ---------------------------------------------------------------------------

app.get('/api/stats', (req, res) => {
  const employees = readJson(EMPLOYEES_FILE);
  const attendance = readJson(ATTENDANCE_FILE);

  const totalEmployees = employees.length;
  const totalRecords = attendance.length;

  let totalPercentageSum = 0;
  let eligibleCount = 0;
  let notEligibleCount = 0;

  const deptStats = {};

  attendance.forEach(rec => {
    totalPercentageSum += rec.percentage;
    if (rec.status === 'Eligible') {
      eligibleCount++;
    } else {
      notEligibleCount++;
    }

    const dept = rec.department || 'Other';
    if (!deptStats[dept]) {
      deptStats[dept] = { count: 0, sumPercent: 0, eligible: 0, notEligible: 0 };
    }
    deptStats[dept].count++;
    deptStats[dept].sumPercent += rec.percentage;
    if (rec.status === 'Eligible') deptStats[dept].eligible++;
    else deptStats[dept].notEligible++;
  });

  const avgAttendance = totalRecords > 0 ? (totalPercentageSum / totalRecords).toFixed(1) : 0;
  const eligibleRate = totalRecords > 0 ? ((eligibleCount / totalRecords) * 100).toFixed(1) : 0;

  // Breakdown array for charts
  const departmentBreakdown = Object.keys(deptStats).map(name => ({
    department: name,
    totalRecords: deptStats[name].count,
    avgPercentage: parseFloat((deptStats[name].sumPercent / deptStats[name].count).toFixed(1)),
    eligible: deptStats[name].eligible,
    notEligible: deptStats[name].notEligible
  }));

  return res.json({
    totalEmployees,
    totalRecords,
    avgAttendance: parseFloat(avgAttendance),
    eligibleCount,
    notEligibleCount,
    eligibleRate: parseFloat(eligibleRate),
    departmentBreakdown,
    recentRecords: attendance.slice(0, 5)
  });
});

// Fallback to frontend index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[PORT NOTICE] Port ${PORT} is already in use by another running instance.`);
    console.error(`The web application is already accessible at: http://localhost:${PORT}`);
    console.error(`To restart, close the running terminal window or process and re-run "npm start".\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Employee Attendance Tracker Server started`);
  console.log(`Web URL:      http://localhost:${PORT}`);
  console.log(`WebSocket:    ws://localhost:${PORT}/ws/terminal`);
  console.log(`Original Java: ${ORIGINAL_JAVA_FILE}`);
  console.log(`=======================================================`);
});
