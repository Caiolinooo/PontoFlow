@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Build Android APK com Expo (Local)
echo ========================================
echo.

REM Diretório do projeto mobile
set "MOBILE_DIR=%~dp0mobile"

if not exist "%MOBILE_DIR%" (
    echo Erro: Diretorio 'mobile/' nao encontrado.
    echo Por favor, execute este script a partir da pasta mobile/ ou especifique o caminho.
    exit /b 1
)

cd /d "%MOBILE_DIR%"

echo Passo 1: Verificando Node.js...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo Erro: Node.js nao encontrado. Instale primeiro.
    exit /b 1
)
echo Encontrado: %node_version%
echo.

echo Passo 2: Installando dependencias...
call npm install --legacy-peer-deps
if !errorlevel! neq 0 (
    echo Falha na instalacao
    exit /b 1
)
echo.

echo Passo 3: Configuracao do Expo...
if not exist ".env" (
    echo AVISO: Arquivo .env nao encontrado. Crie-o com suas credenciais.
)
echo.

echo Passo 4: Build local do APK usando EAS Build...
echo Nota: Este processo pode levar 30-60 minutos na primeira vez
echo.

npx eas-cli build --platform android --local --profile preview

echo.
echo ========================================
echo Build concluido! Verifique os arquivos:
echo   %LOCALAPPDATA%\Cache\EAS Build\
echo ========================================

endlocal
