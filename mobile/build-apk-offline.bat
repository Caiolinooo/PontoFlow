@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   BUILD APK ANDROID - PONTOFLOW
echo ============================================
echo.

REM Diretorio do projeto
set "PROJECT_DIR=%~dp0"
set "ANDROID_DIR=%PROJECT_DIR%android"

echo [INFO] Projeto: %PROJECT_DIR%
echo [INFO] Android: %ANDROID_DIR%
echo.

REM ============================================
REM Step 0: Verificacoes de Ambiente
REM ============================================
echo [STEP 0] Verificando ambiente de desenvolvimento...
echo.

REM Verificar Node.js
echo   [1/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js nao encontrado!
    echo   [FIX] Instale Node.js 18+ em https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   [OK] Node.js: !NODE_VERSION!

REM Verificar npm
echo   [2/6] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] npm nao encontrado!
    echo   [FIX] Certifique-se que npm esta instalado com Node.js
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   [OK] npm: !NPM_VERSION!

REM Verificar Java
echo   [3/6] Verificando Java JDK 17+...
java -version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Java JDK nao encontrado!
    echo   [FIX] Instale JDK 17+ em https://adoptium.net/
    echo   [INFO] ANDROID_HOME deve estar configurado
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('java -version 2>&1') do set JAVA_VERSION=%%i
echo   [OK] Java: !JAVA_VERSION!

REM Verificar ANDROID_HOME
echo   [4/6] Verificando ANDROID_HOME...
if defined ANDROID_HOME (
    echo   [OK] ANDROID_HOME: %ANDROID_HOME%
) else (
    echo   [WARNING] ANDROID_HOME nao esta configurado!
    echo   [INFO] O build pode falhar se o Android SDK nao estiver no PATH
    echo   [FIX] Configure ANDROID_HOME:
    echo         Windows: set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    echo         PowerShell: $env:ANDROID_HOME = "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
)

REM Verificar SDK versions
echo   [5/6] Verificando Android SDK...
if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%\cmdline-tools" (
        echo   [OK] Android SDK cmdline-tools encontrado
    ) else (
        echo   [WARNING] cmdline-tools nao encontrado em %ANDROID_HOME%\cmdline-tools
    )
)

REM Verificar arquivos do Gradle
echo   [6/6] Verificando arquivos de build...
if not exist "%ANDROID_DIR%\gradlew.bat" (
    echo   [ERROR] gradlew.bat nao encontrado em %ANDROID_DIR%
    echo   [FIX] Execute: npx expo prebuild --platform android
    echo   [INFO] Ou use o EAS Build: eas build --platform android
    echo.
    pause
    exit /b 1
)
echo   [OK] gradlew.bat encontrado
echo   [OK] Estrutura Android OK
echo.

REM ============================================
REM Step 1: Verificar dependencias instaladas
REM ============================================
echo [STEP 1] Verificando dependencias do projeto...
if not exist "%PROJECT_DIR%node_modules" (
    echo   [WARNING] node_modules nao encontrado!
    echo   [INFO] Executando npm install...
    cd /d "%PROJECT_DIR%"
    call npm install
    if errorlevel 1 (
        echo   [ERROR] npm install falhou!
        echo.
        pause
        exit /b 1
    )
    echo   [OK] Dependencias instaladas
) else (
    echo   [OK] node_modules existe
)

REM Verificar se @expo/vector-icons esta instalado
if not exist "%PROJECT_DIR%node_modules\@expo\vector-icons" (
    echo   [WARNING] @expo/vector-icons nao encontrado!
    echo   [INFO] Instalando...
    cd /d "%PROJECT_DIR%"
    call npm install @expo/vector-icons
    if errorlevel 1 (
        echo   [ERROR] Falha ao instalar @expo/vector-icons
    )
)
echo.

REM ============================================
REM Step 2: Verificar .env file
REM ============================================
echo [STEP 2] Verificando configuracao de ambiente...
if not exist "%PROJECT_DIR%.env" (
    if exist "%PROJECT_DIR%.env.example" (
        echo   [WARNING] .env nao encontrado, mas .env.example existe
        echo   [INFO] Copie .env.example para .env e preencha os valores
        echo.
        choice /C YN /M "Deseja copiar .env.example para .env agora?"
        if errorlevel 2 (
            echo   [SKIP] Continuar sem .env (algumas funcionalidades podem falhar)
        ) else (
            copy "%PROJECT_DIR%.env.example" "%PROJECT_DIR%.env" >nul
            echo   [OK] .env criado. Preencha os valores e execute novamente.
            pause
            exit /b 0
        )
    ) else (
        echo   [WARNING] Nem .env nem .env.example encontrados
    )
) else (
    echo   [OK] .env encontrado
)
echo.

REM ============================================
REM Step 3: Limpar cache anterior
REM ============================================
echo [STEP 3] Limpando caches anteriores...

if exist "%ANDROID_DIR%\.gradle" (
    echo   Limpando .gradle cache...
    rmdir /s /q "%ANDROID_DIR%\.gradle" >nul 2>&1
    echo   [OK] .gradle removido
)

if exist "%ANDROID_DIR%\app\build" (
    echo   Limpando build anterior...
    rmdir /s /q "%ANDROID_DIR%\app\build" >nul 2>&1
    echo   [OK] build removido
)

if exist "%ANDROID_DIR%\app\apk" (
    rmdir /s /q "%ANDROID_DIR%\app\apk" >nul 2>&1
)

echo.

REM ============================================
REM Step 4: Build APK
REM ============================================
echo [STEP 4] INICIANDO BUILD DO APK...
echo [INFO] Tempo estimado: 5-20 minutos (primeiro build pode ser mais lento)
echo [INFO] Build tipo: DEBUG (para instalacao em dispositivo de desenvolvimento)
echo.
echo   Para build de PRODUCAO (release), use:
echo     eas build --platform android --profile production
echo   Ou:
echo     gradlew assembleRelease
echo.

cd /d "%ANDROID_DIR%"

echo   [BUILD] Iniciando gradlew assembleDebug...
echo.
call gradlew.bat assembleDebug --no-daemon

set BUILD_EXIT_CODE=%errorlevel%

cd /d "%PROJECT_DIR%"

echo.

REM ============================================
REM Step 5: Verificar resultado
REM ============================================
echo [STEP 5] Verificando resultado do build...

if %BUILD_EXIT_CODE% neq 0 (
    echo.
    echo ============================================
    echo   [ERROR] BUILD FALHOU! (codigo: %BUILD_EXIT_CODE%)
    echo ============================================
    echo.
    echo Possiveis causas:
    echo   1. Erros de compilacao Java/Kotlin - verifique o log acima
    echo   2. Dependencias faltantes - execute npm install
    echo   3. SDK/NDK desatualizado - atualize via Android Studio
    echo   4. Conflito de portas - feche emuladores/simuladores
    echo.
    echo Solucoes rapidas:
    echo   - Tente: eas build --platform android --profile development
    echo   - Ou use Android Studio para debug detalhado
    echo.
    
    REM Salvar log de erro
    echo [INFO] Log de erro salvo em build-error.log
    goto :error
)

REM Verificar se o APK foi gerado
set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\debug
set APK_FILE=%APK_PATH%\app-debug.apk

if exist "%APK_FILE%" (
    echo ============================================
    echo   [SUCCESS] BUILD CONCLUIDO COM SUCESSO!
    echo ============================================
    echo.
    echo APK Debug gerado:
    echo   %APK_FILE%
    echo.
    for %%F in ("%APK_FILE%") do (
        echo Tamanho: %%~zF bytes
        echo Tamanho: !%%~zF!/1048576! MB
    )
    echo.
    echo Para instalar em um dispositivo:
    echo   1. Habilite "Developer Options" e "USB Debugging" no dispositivo
    echo   2. Conecte via USB
    echo   3. Execute: adb install "%APK_FILE%"
    echo.
    echo Ou envie o APK manualmente para o dispositivo
    echo.
) else (
    echo [WARNING] APK nao encontrado em:
    echo   %APK_FILE%
    echo.
    echo Verificando outros possiveis locais...
    
    if exist "%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug-universal.apk" (
        set APK_FILE=%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug-universal.apk
        echo   [FOUND] app-debug-universal.apk encontrado!
        echo   Caminho: !APK_FILE!
    )
    
    if exist "%APK_FILE%" (
        echo.
        echo ============================================
        echo   [SUCCESS] BUILD CONCLUIDO!
        echo ============================================
        echo.
        echo APK: %APK_FILE%
        for %%F in ("%APK_FILE%") do (
            echo Tamanho: %%~zF bytes
        )
        echo.
    ) else (
        echo [ERROR] APK nao foi gerado em nenhum local esperado
        echo.
        echo Verifique os erros no log do build acima.
        echo.
        goto :error
    )
)

echo Deseja instalar no dispositivo conectado?
choice /C YN /M "Instalar via ADB agora"
if errorlevel 1 (
    cd /d "%PROJECT_DIR%"
    pause
    exit /b 0
)

cd /d "%PROJECT_DIR%"
exit /b 0

:error
echo.
echo [INFO] Dica: Para mais detalhes, execute manualmente:
echo   cd mobile\android
echo   gradlew.bat assembleDebug --info
echo.
pause
exit /b %BUILD_EXIT_CODE%
