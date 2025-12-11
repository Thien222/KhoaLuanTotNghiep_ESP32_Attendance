@echo off
echo ======================================
echo   EAS BUILD STATUS CHECKER
echo ======================================
echo.
echo Checking latest build status...
echo.

cd /d d:\ProjectKLTN\KhoaLuanTotNghiep_ESP32_Attendance\mobile

eas build:list --platform android --limit 1

echo.
echo ======================================
echo To view detailed logs:
echo   eas build:view [BUILD_ID]
echo.
echo To download APK when ready:
echo   Visit: https://expo.dev/accounts/thien0709/projects/hrm-mobile/builds
echo ======================================
pause
