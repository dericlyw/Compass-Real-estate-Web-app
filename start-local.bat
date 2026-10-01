@echo off
REM PropVid — run locally on Windows. Double-click this file.
REM Needs Node.js 22 or newer: https://nodejs.org (LTS installer).
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS version from https://nodejs.org then run this again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing ^(first run only, about 1-2 minutes^)...
  call npm install || (pause & exit /b 1)
)
echo.
echo Starting PropVid at http://localhost:3000  (close this window to stop)
start "" /b cmd /c "timeout /t 10 >nul & start http://localhost:3000/engine"
call npm run dev
pause
