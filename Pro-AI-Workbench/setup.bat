@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Pro AI Workbench - first-time setup
echo ==========================================
echo This installs Node.js, Codex CLI, and Antigravity CLI if missing.
echo It does not sign in to accounts or make purchases.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 (
  echo.
  echo Setup stopped. Read the message above, then run setup.bat again.
  pause
  exit /b 1
)
