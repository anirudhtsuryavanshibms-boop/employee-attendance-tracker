@echo off
title Employee Attendance Tracker - Standalone Java Console
color 0B

echo ======================================================================
echo       ORIGINAL JAVA PROGRAM CONSOLE RUNNER (EmployeeAttendance)
echo ======================================================================
echo Source file: backend\src\original\EmployeeAttendance.java
echo.

echo Compiling EmployeeAttendance.java...
javac "backend\src\original\EmployeeAttendance.java"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation failed.
    pause
    exit /b 1
)

echo.
echo Running compiled Java program (Interactive Console):
echo ----------------------------------------------------------------------
java -cp "backend\src\original" EmployeeAttendance
echo ----------------------------------------------------------------------
echo.
echo Execution complete.
pause
