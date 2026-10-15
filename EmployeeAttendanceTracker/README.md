# Employee Attendance Tracker

A professional, full-stack Employee Attendance Management System built around an **exact, unmodified Java program** (`EmployeeAttendance.java`). This project demonstrates how a foundational console-based Java program can be integrated into a modern web dashboard and interactive developer terminal for practical college demonstrations and real-world evaluation.

---

## 1. Project Overview

- **Project Name:** Employee Attendance Tracker
- **Academic Purpose:** College Practical Examination & Project Demonstration
- **Target Audience:** Engineering Students, College Professors, and Evaluators
- **Original Java Program:** Preserved 100% intact as the single source of truth in `backend/src/original/EmployeeAttendance.java` and `backend/src/main/java/original/EmployeeAttendance.java`.
- **System Architecture:** Clean separation of concerns between the original Java logic, the Node.js integration server, and a responsive web dashboard with live WebSocket terminal streaming.

---

## 2. Core Java Logic & Specification (Unmodified)

The original Java program implements the core business logic for attendance calculation:

```java
import java.util.Scanner;

class EmployeeAttendance {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter employee name: ");
        String name = sc.nextLine();

        char[] attendance = new char[5];
        int presentDays = 0;

        System.out.println("Enter attendance for exactly 5 days (P/A):");

        for (int i = 0; i < 5; i++) {
            System.out.print("Day " + (i + 1) + ": ");
            String input = sc.next().toUpperCase();

            if (input.length() != 1 ||
                (input.charAt(0) != 'P' && input.charAt(0) != 'A')) {
                System.out.println("Invalid input! Enter only P or A.");
                i--;
                continue;
            }

            attendance[i] = input.charAt(0);

            if (attendance[i] == 'P') {
                presentDays++;
            }
        }

        double percentage = (presentDays / 5.0) * 100;

        System.out.println("\nEmployee Name: " + name);
        System.out.println("Present Days: " + presentDays);
        System.out.printf("Attendance: %.2f%%%n", percentage);

        if (percentage >= 75) {
            System.out.println("Status: Eligible");
        } else {
            System.out.println("Status: Not Eligible");
        }

        sc.close();
    }
}
```

### Key Principles of the Logic:
1. **5-Day Fixed Cycle:** An array `char[] attendance = new char[5]` tracks exactly 5 days of attendance.
2. **Strict Character Validation:** Inputs are converted to uppercase and checked against `'P'` and `'A'`. Invalid entries prompt `"Invalid input! Enter only P or A."` and re-prompt the same day (`i--`).
3. **Exact Percentage Formula:** `(presentDays / 5.0) * 100`. Floating-point division (`5.0`) prevents integer truncation.
4. **Eligibility Threshold:** Candidates with `percentage >= 75.0%` receive `Status: Eligible`; below 75% receives `Status: Not Eligible`.

---

## 3. Features Implemented

### A. Real-Time Developer Terminal (VS Code Style)
- **Authentic IDE Theme:** Dark charcoal developer aesthetic with window controls and file tabs.
- **Real-Time Interactive Execution:** Live `java EmployeeAttendance` process execution with WebSocket bidirectional streaming. You can type directly into the terminal input prompt just like Command Prompt!
- **Source Code Viewer:** Displays the exact `EmployeeAttendance.java` file on disk with syntax highlighting, line numbers, and copy button.
- **One-Click Viva Demos:** Built-in test presets (100% Eligible, 80% Eligible, 60% Not Eligible, and Invalid Input Validation check) for instant professor demos.
- **Real Compilation (`javac`):** Live button to execute `javac` and verify bytecode generation.

### B. Executive Attendance Dashboard
- **Top Metrics:** Total Employees, Overall Average Attendance %, Eligible Count (≥ 75%), Not Eligible Count (< 75%).
- **Interactive Visualizations:**
  - *Department Attendance Distribution* (Bar Chart via Chart.js).
  - *Eligibility Compliance Ratio* (Doughnut Chart via Chart.js).
- **Recent Activity Ledger:** Live table displaying recent 5-day cycles with color-coded day pills (`[P][P][P][A][P]`).

### C. Personnel Directory (Employee Management)
- **Directory Table:** Employee ID, Avatar, Name, Department, Designation, Attendance %, Eligibility Badge, Actions.
- **CRUD Operations:** Register New Employee, Edit Profile, View Dossier, Delete with confirmation.
- **Validation:** Enforces minimum 2-character names, valid email formats, and unique records.
- **Filters & Search:** Real-time search across names, IDs, departments, and eligibility status.

### D. Attendance Management & 5-Day Recording
- **Interactive 5-Day Selector:** Clickable toggle buttons for Day 1 through Day 5 (`P` vs `A`).
- **Live Computation Card:** Real-time formula preview showing `Present Days`, `Calculated %`, and `Eligibility Status` before submitting.
- **Live Java Process Execution Toggle:** Checkbox to pipe inputs directly through the real Java program runtime and parse the native stdout.
- **Export & Reporting:** One-click CSV ledger export.

### E. College Presentation & Viva Blueprint
- System Architecture diagram.
- Algorithm step-by-step breakdown.
- College Viva Q&A section with model answers to impress professors.

---

## 4. Technologies Used

- **Java Runtime:** Java Standard Edition (JDK 27 / JDK 11+)
- **Backend Service:** Node.js (v24+), Express 4.x, WebSockets (`ws`), Child Process API
- **Frontend Layer:** Semantic HTML5, Modern CSS3 (CSS Custom Properties & Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Data Visualization:** Chart.js 4.x
- **Data Persistence:** JSON File Database (`data/employees.json`, `data/attendance.json`)

---

## 5. Project Folder Structure

```
EmployeeAttendanceTracker/
│
├── backend/
│   ├── src/
│   │   ├── original/
│   │   │   └── EmployeeAttendance.java        <-- Exact, unmodified Java source code
│   │   └── main/java/original/
│   │       └── EmployeeAttendance.java        <-- Standard Maven package path
│   ├── package.json                           <-- Backend dependencies (express, ws, cors)
│   └── server.js                              <-- Express & WebSocket server with child_process execution
│
├── frontend/
│   ├── index.html                             <-- Single Page Application layout
│   ├── css/
│   │   ├── style.css                          <-- Main responsive design system
│   │   └── terminal.css                       <-- VS Code style terminal styles
│   ├── js/
│   │   ├── app.js                             <-- Routing, telemetry, toast alerts, charts
│   │   ├── employees.js                       <-- Employee directory CRUD & search
│   │   ├── attendance.js                      <-- 5-day cycle recording & CSV export
│   │   └── terminal.js                        <-- WebSocket terminal & live Java runner
│   └── assets/
│       └── logo.svg                           <-- Custom SVG branding
│
├── data/
│   ├── employees.json                         <-- Employee records
│   └── attendance.json                        <-- 5-day attendance cycle records
│
├── start.bat                                  <-- One-click Windows starter
├── start.sh                                   <-- One-click Linux/Mac starter
├── run-java.bat                               <-- Standalone Windows Java console runner
├── run-java.sh                                <-- Standalone Linux/Mac Java console runner
├── .gitignore
└── README.md
```

---

## 6. How to Run the Project

### Option A: Quick One-Click Windows Launcher (Recommended)
Simply double-click:
```bat
start.bat
```
This script automatically:
1. Compiles `EmployeeAttendance.java`.
2. Starts the Node.js backend server.
3. Opens `http://localhost:3000` in your default browser.

---

### Option B: Manual Command Line Execution

#### Step 1: Compile the Java Program
Open PowerShell or Command Prompt in the project root:
```powershell
javac backend/src/original/EmployeeAttendance.java
```

#### Step 2: Start the Backend Server
```powershell
cd backend
npm start
```
You will see:
```
=======================================================
Employee Attendance Tracker Server started
Web URL:      http://localhost:3000
WebSocket:    ws://localhost:3000/ws/terminal
Original Java: ...\backend\src\original\EmployeeAttendance.java
=======================================================
```

#### Step 3: Open the Web Application
Open your browser and navigate to:
```
http://localhost:3000
```

---

### Option C: Run the Raw Java Program Standalone (No Web Interface)
If your professor asks: *"Can you run this raw Java code right now in Command Prompt?"*
Simply run:
```bat
run-java.bat
```
Or manually:
```powershell
java -cp backend/src/original EmployeeAttendance
```
You will be prompted to enter the employee name and attendance for Day 1 through Day 5 interactively.

---

## 7. How to Demonstrate to Your Professor

1. **Show the Dashboard:**
   - Point out the key metrics: Total Employees, Average Attendance %, Eligible vs. Not Eligible counts.
   - Explain the Doughnut and Bar charts showing compliance and department distributions.

2. **Show the Java Developer Terminal:**
   - Navigate to the **Java Terminal** tab in the sidebar.
   - Click the **`EmployeeAttendance.java`** tab at the top of the terminal to display your actual, unmodified Java code to the professor.
   - Click the **`Terminal`** tab and click **`Run Interactive`**.
   - Type an employee name (e.g. `Professor Sharma`), press Enter, and enter `P`, `P`, `P`, `A`, `P` to show live interactive Scanner execution.
   - Point out the printed summary: `Attendance: 80.00%` and `Status: Eligible`.
   - Click the **"Scenario 4: Scanner Validation Test"** preset to demonstrate how the program catches invalid inputs (e.g. `'X'`) and displays `"Invalid input! Enter only P or A."`.

3. **Record Attendance via the Web Form:**
   - Go to the **Attendance** page.
   - Select an employee, toggle the 5-day buttons (e.g., `P, P, P, A, P`), and highlight the real-time preview updating to `80.00% - Eligible`.
   - Ensure the *"Execute via Live Java Process"* checkbox is checked and click **Submit & Record Attendance**.
   - Show the toast notification proving that the native Java subprocess executed and the record was stored.

4. **Show Personnel Management:**
   - Go to **Employees**, add a test employee, search by name, and edit details to demonstrate full-stack capabilities.

---

## 8. College Viva Q&A Reference

- **Q1: Why is your Java code in `backend/src/original/` instead of embedded in JavaScript?**
  *Answer:* To maintain absolute code integrity and demonstrate pure Java proficiency. The Java code is the authoritative source of truth; the web tier communicates with it via OS streams rather than rewriting it.

- **Q2: Why did you use `5.0` instead of `5` in the percentage formula?**
  *Answer:* In Java, `int / int` performs integer division and truncates decimal values to zero (e.g. `4 / 5 = 0`). Dividing by `5.0` promotes the calculation to floating-point (`double`), accurately yielding `0.80 * 100 = 80.00%`.

- **Q3: How does the program prevent an infinite loop on invalid inputs?**
  *Answer:* When an invalid token is entered, `i--` offsets the subsequent loop increment `i++`, allowing the loop to repeat the same day index while preserving previously entered valid days.

- **Q4: How does the web terminal interact with `Scanner(System.in)`?**
  *Answer:* The Node.js server spawns the Java process using `child_process.spawn`. It pipes browser input from the WebSocket into the Java process's `stdin` and broadcasts `stdout` chunks back to the browser in real time.

---

## 9. Known Limitations & Design Rationale

1. **Fixed 5-Day Model:** The original Java program is designed for a single 5-day cycle per run. The web interface models this exact 5-day cycle rather than arbitrary calendars to stay 100% faithful to the original logic.
2. **Single-Execution Process:** Each run of the original Java program processes one employee before calling `sc.close()`. The web application honors this by spinning up a fresh execution session for each test run.

---

## 10. License & Credits

Developed for academic evaluation. Preserves the original `EmployeeAttendance.java` logic without modification.
