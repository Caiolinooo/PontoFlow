@echo off
setlocal

cd /d "%~dp0"

echo Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo.
echo Running EAS build (local)...
call npx eas-cli@latest build --platform android --local

endlocal
