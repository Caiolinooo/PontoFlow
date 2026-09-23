@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Build Android APK with Capacitor
echo ========================================
echo.

REM Diretório do projeto web
set "WEB_DIR=%~dp0web"

if not exist "%WEB_DIR%" (
    echo Error: Directory 'web/' not found.
    exit /b 1
)

cd /d "%~dp0"

if not exist "%WEB_DIR%\node_modules" (
    echo Step 1: Installing Next.js dependencies...
    call "%WEB_DIR%\npm install"
    if !errorlevel! neq 0 (
        echo Build failed during dependency installation.
        exit /b 1
    )
    echo.
)

echo Step 2: Building Next.js application...
call "%WEB_DIR%\npm run build"
if !errorlevel! neq 0 (
    echo Build failed for Next.js.
    exit /b 1
)
echo.

if not exist "%WEB_DIR%\www" (
    echo WARNING: Directory 'www/' not found after build.
    pause
    exit /b 1
)

echo Step 3: Setting up Capacitor...
call npx @capacitor/cli init --id "com.abzgroup.com.br" --name "TimeSheet Manager"
if !errorlevel! neq 0 (
    echo Failed to initialize Capacitor.
    exit /b 1
)
echo.

echo Step 4: Copying build files to Capacitor Android project...
rd /s /q "%WEB_DIR%\android" 2>nul
xcopy /e /i /y "%WEB_DIR%\www" "%WEB_DIR%\android\app"
echo.

echo Step 5: Installing Android dependencies...
call "%WEB_DIR%\android\npm install"
if !errorlevel! neq 0 (
    echo Note: Some Node modules may fail to install but this is okay.
)
echo.

echo ========================================
echo Configuration complete!
echo To build the final APK:
echo.
echo   cd android/
echo
echo   -- Option A: Using Capacitor (recommended)
echo   npx @capacitor/cli sync ^&^& npx @capacitor/cli build android
echo
echo   -- Option B: Directly with Gradle
echo   gradlew.bat assembleDebug
echo
echo The final APK will be at:
echo   android/app/build/outputs/apk/debug/app-debug.apk
echo ========================================

endlocal
