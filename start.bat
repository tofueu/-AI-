@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

rem NOVA integrated startup: no elevation or execution-policy bypass.
rem If PowerShell or the optional pet files are unavailable, the Workbench still starts.
if exist "%~dp0nova.ps1" if exist "%~dp0nova-tasks.ps1" (
  where powershell.exe >nul 2>nul
  if not errorlevel 1 (
    start "NOVA" powershell.exe -NoProfile -WindowStyle Hidden -STA -File "%~dp0nova.ps1"
  ) else (
    echo NOVA overlay unavailable: PowerShell is not installed.
  )
) else (
  echo NOVA overlay files missing; Workbench will start without the pet.
)

start "" http://127.0.0.1:4173
npm start
pause
