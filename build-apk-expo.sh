#!/bin/bash
# Script para gerar APK localmente usando Expo EAS Build

set -e

echo "========================================"
echo "Build Android APK com Expo (Local)"
echo "========================================"
echo ""

# Diretório do projeto mobile
MOBILE_DIR="$(pwd)/mobile"

if [ ! -d "$MOBILE_DIR" ]; then
    echo "Erro: Diretório 'mobile/' não encontrado."
    echo "Por favor, execute este script ou um de seus subscripts a partir da pasta mobile/"
    exit 1
fi

cd "$MOBILE_DIR"

echo "Passo 1: Verificando se o Node.js está instalado..."
if ! command -v node &> /dev/null; then
    echo "Erro: Node.js não encontrado. Instale primeiro."
    exit 1
fi
echo "Node.js encontrador: $(node --version)"
echo ""

echo "Passo 2: Instalando dependências..."
npm install --legacy-peer-deps
echo ""

echo "Passo 3: Configurando ambiente Expo..."
# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "AVISO: Arquivo .env não encontrado. Crie-o com suas credenciais Supabase."
fi
echo ""

echo "Passo 4: Build local do APK usando EAS Build..."
echo "Nota: Este processo pode levar 30-60 minutos na primeira execução"
echo "      porque baixa todos os build tools locaismente."
echo ""

npx eas-cli build --platform android --local --profile preview

echo ""
echo "========================================"
echo "Build concluído! Verifique a pasta:"
echo "  ~/Library/Cache/EAS Build/"
echo "Ou local no diretório de build do projeto se aplicável"
echo "========================================"
