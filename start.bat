@echo off
title CITCS Schedule Management System

set PORT=3000
set SERVER_DIR=%~dp0schedule-app\backend

echo ============================================
echo  CITCS Schedule Management System
echo ============================================
echo.
echo Starting server...

cd /d "%SERVER_DIR%"

start "" http://localhost:%PORT%

node server.js
