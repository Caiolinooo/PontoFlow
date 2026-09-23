@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo Build Android APK with Capacitor
echo ========================================
echo.

REM Step 1: Install dependencies
echo [Step 1/5] Installing dependencies...
call npm install --legacy-peer-deps
if !errorlevel! neq 0 (
    echo Failed to install dependencies
    exit /b 1
)
echo.

REM Step 2: Build Next.js application
echo [Step 2/5] Building Next.js application...
call npm run build
if !errorlevel! neq 0 (
    echo Failed to build Next.js
    exit /b 1
)
echo.

REM Check if .next directory exists with required structure
if not exist ".next\static" (
    echo Error: .next/static not found after build
    exit /b 1
)

if not exist ".next/server" (
    echo Error: .next/server not found after build
    exit /b 1
)
echo.

REM Step 3: Initialize Capacitor if needed
if not exist "android\capacitor.config.json" (
    echo [Step 3/5] Initializing Capacitor...
    
    REM Create android directory and initialize
    if not exist "android" mkdir android
    
    echo This initialization may prompt for interactive input.
    echo Please ensure you can respond to the capacitor init prompts.
    echo Press Enter after each prompt with your selections...
    
    call npx @capacitor/cli init --app-id "com.abzgroup.com.br" --app-name "TimeSheet Manager"
    
    if !errorlevel! neq 0 (
        echo Capacitor initialization failed or was interrupted
        exit /b 1
    )
)
echo.

REM Step 4: Copy build output to www directory
echo [Step 4/5] Copying build output to Capacitor www directory...
rd /s /q "www" 2>nul
rd /s /q "android/www" 2>nul

xcopy /e /i /y ".next\static" "www\static"
if !errorlevel! neq 0 (
    echo Warning: Failed to copy static files
)

copy /y ".next/BUILD_ID" "www\" 2>nul
copy /y ".next/required-server-files.json" "www\" 2>nul

echo.
echo Next.js build output copied successfully.
echo.

REM Step 5: Prepare Android project
echo [Step 5/5] Preparing Android project...
if exist "android\package.json" (
    pushd android
    call npm install --legacy-peer-deps || true
    popd
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To build the APK, run:
echo   cd android
echo   npx @capacitor/cli sync
echo   npx @capacitor/cli build android
echo or directly:
echo   npx @capacitor/cli build android
echo.
echo The APK will be located at:
echo   android/app/build/outputs/apk/debug/app-debug.apk
echo.

endlocal
