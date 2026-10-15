#!/usr/bin/env bash
echo "======================================================================"
echo "      ORIGINAL JAVA PROGRAM CONSOLE RUNNER (EmployeeAttendance)"
echo "======================================================================"
echo "Source: backend/src/original/EmployeeAttendance.java"
echo ""

javac backend/src/original/EmployeeAttendance.java
if [ $? -ne 0 ]; then
  echo "[ERROR] Compilation failed."
  exit 1
fi

echo "Running EmployeeAttendance:"
echo "----------------------------------------------------------------------"
java -cp backend/src/original EmployeeAttendance
echo "----------------------------------------------------------------------"
