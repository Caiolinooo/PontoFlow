#!/bin/bash
# Script para gerar APK localmente usando Capacitor + Next.js

set -e

echo "========================================"
echo "Build Android APK com Capacitor"
echo "========================================"
echo ""

# Diretório do projeto web
WEB_DIR="$(pwd)/web"

if [ ! -d "$WEB_DIR" ]; then
    echo "Erro: Diretório 'web/' não encontrado."
    exit 1
fi

cd "$WEB_DIR"

# Verificar se estamos no diretário certo ou precisa ir para o pai
PARENT_DIR="$(dirname "$(pwd)")"
if [ -f "$PARENT_DIR/package.json" ] && [ -d "$WEB_DIR" ]; then
    echo "Execute este script a partir da pasta que contém ambos web/ e este script,"
    echo "ou navegue para web/ antes de executar."
    exit 1
fi

echo "Passo 1: Instalando dependências do Next.js..."
npm install
if [ ${{ $? }} -ne 0 ]; then
    echo "Falha na instalação das dependências"
    exit 1
fi
echo ""

echo "Passo 2: Build da aplicação Next.js..."
npm run build
if [ ${{ $? }} -ne 0 ]; then
    echo "Falha no build do Next.js"
    exit 1
fi
echo ""

# Verificar se o diretório 'www' foi criado após o build
if [ ! -d "www" ]; then
    echo "AVISO: Diretorio 'www/' nao encontrado apos o build."
    echo "Isso pode acontecer se houver erros no processo de build."
    exit 1
fi

echo "Passo 3: Verificando Capacitor..."
if ! command -v npx &> /dev/null || ! npx @capacitor/cli about | grep -q "Capacitor"; then
    echo "Instalando Capacitor localmente..."
    npm install --save-dev @capacitor/android @capacitor/cli @capacitor/core
fi
echo ""

echo "Passo 4: Configurando Capacitor..."
npx @capacitor/cli init \
    --id "com.abzgroup.com.br" \
    --name "TimeSheet Manager"
echo ""

echo "Passo 5: Copiando build Next.js para capacitor www/..."
rm -rf android
cp -r www android/
echo ""

echo "Passo 6: Instalando dependências do projeto Android..."
cd android
npm install || true
cd ..
echo ""

echo "========================================"
echo "Build concluido! Para finalizar o APK:"
echo ""
echo "  1. Entre na pasta android/:"
echo "     cd android/"
echo ""
echo "  2. Instale Gradle se necessario:"
echo "     npx @capacitor/cli android"
echo ""
echo "  3. Build do APK usando gradlew ou Capacitor:"
echo "     # Opcao A - Usando Capacitor (recomendado)"
echo "     npx @capacitor/cli sync && npx @capacitor/cli build android"
echo ""
echo "     # Opcao B - Diretamente com Gradle"
echo "     ./gradlew assembleDebug"
echo ""
echo "O APK final estara em: android/app/build/outputs/apk/debug/app-debug.apk"
echo "========================================
