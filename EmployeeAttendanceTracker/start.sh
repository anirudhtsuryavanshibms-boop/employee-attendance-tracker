#!/usr/bin/env bash
echo "======================================================================"
echo "          EMPLOYEE ATTENDANCE TRACKER - STARTUP LAUNCHER"
echo "======================================================================"
echo ""

# Compile Java
echo "[1/3] Compiling original Java source code..."
javac backend/src/original/EmployeeAttendance.java
if [ $? -ne 0 ]; then
  echo "[ERROR] Java compilation failed."
  exit 1
fi
echo "     -> Compiled successfully."

echo "[2/3] Starting backend server on http://localhost:3000..."
cd backend
node server.js
