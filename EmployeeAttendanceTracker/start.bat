@echo off
title Employee Attendance Tracker - System Launcher
color 0A

echo ======================================================================
echo           EMPLOYEE ATTENDANCE TRACKER - STARTUP LAUNCHER
echo ======================================================================
echo.

:: Check Java
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Java runtime not found on PATH. Please install Java JDK.
    pause
    exit /b 1
)

:: Check Node
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found on PATH. Please install Node.js.
    pause
    exit /b 1
)

echo [1/3] Compiling original Java source code (EmployeeAttendance.java)...
javac "backend\src\original\EmployeeAttendance.java"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation of EmployeeAttendance.java failed.
    pause
    exit /b 1
)
echo      -> Compiled successfully.

echo [2/3] Starting Attendance Tracker Server...
echo      -> Web Application URL: http://localhost:3000
echo      -> Original Java File:  backend\src\original\EmployeeAttendance.java
echo.

:: Launch default web browser after 2 seconds
start "" http://localhost:3000

echo [3/3] Server is running! Press Ctrl+C to terminate.
cd backend
node server.js
