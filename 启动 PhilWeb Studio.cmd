@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [PhilWeb Studio] Node.js LTS was not found.
  echo Install Node.js LTS, then double-click this file again.
  echo Download: https://nodejs.org/
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [PhilWeb Studio] npm was not found. Please reinstall Node.js LTS.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo [PhilWeb Studio] First launch: installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo [PhilWeb Studio] Dependency installation failed. Check the error above and try again.
    pause
    exit /b 1
  )
)

echo.
echo [PhilWeb Studio] Starting Studio. Your browser will open automatically...
call npm.cmd run studio
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [PhilWeb Studio] Studio stopped with exit code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
