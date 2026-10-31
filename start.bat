@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22 or newer is required: https://nodejs.org/
  exit /b 1
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell 5.1 is required for NOVA.
  exit /b 1
)

rem Do not mistake an open browser for a running backend.
rem A separately launched Node process keeps NOVA task updates alive after
rem the application window or this launcher closes.
call :wait_for_api 1
if errorlevel 1 (
  start "AI Workbench backend" /min node "%~dp0server.js"
  call :wait_for_api 20
  if errorlevel 1 (
    echo [ERROR] Local backend did not respond on 127.0.0.1:4173.
    echo Check whether another process owns the port or Node failed to start.
    exit /b 1
  )
)

rem CI can validate the real backend without opening interactive WPF.
if not "%NOVA_NO_OVERLAY%"=="1" (
  start "NOVA Desktop Pet" /min powershell.exe -NoProfile -STA -File "%~dp0nova.ps1"
)
if not "%NOVA_NO_APP_WINDOW%"=="1" (
  start "AI Workbench Desktop App" powershell.exe -NoProfile -STA -File "%~dp0nova-app.ps1"
)
exit /b 0

:wait_for_api
set /a _tries=%~1
:wait_again
powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173/api/tasks' -TimeoutSec 1; if ($r.StatusCode -eq 200 -and $r.Content.TrimStart().StartsWith('[')) { exit 0 } } catch { }; exit 1" >nul 2>nul
if not errorlevel 1 exit /b 0
set /a _tries-=1
if %_tries% LEQ 0 exit /b 1
ping -n 2 127.0.0.1 >nul
goto wait_again
