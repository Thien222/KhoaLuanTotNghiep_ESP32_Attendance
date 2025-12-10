@echo off
REM Script to check EAS Build status
REM Run this to see build progress

echo ============================================
echo    Checking EAS Build Status
echo ============================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking build status...
echo.

eas build:list --platform android --limit 1

echo.
echo ============================================
echo Press any key to exit...
pause >nul
