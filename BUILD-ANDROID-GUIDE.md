# Guia para Build Android APK Localmente

Este documento fornece instruções completas para gerar um arquivo APK localmente.

## Opções Disponíveis

### Opção 1: Expo (Recomendado - Mais Simples)

O projeto mobile/ já está configurado com Expo, tornando este a opção mais simples.

#### Método 1A: Build Local Direto
```bash
cd mobile/
npm install --legacy-peer-deps
npx eas-cli build --platform android --local --profile preview
```

#### Método 1B: Usando comando expo run
```bash
cd mobile/
npm install --legacy-peer-deps
npx expo run:android
```

**Tempo estimado:** 30-60 minutos na primeira execução (baixa ferramentas localmente)

**Local do APK resultante:**
- Windows: `C:\Users\<seu_usuario>\AppData\Local\Cache\EAS Build\`
- Ou dentro de `mobile/` se usar build local

---

### Opção 2: Capacitor + Next.js

Se preferir usar o projeto web/ com Next.js, siga estes passos:

#### Passo 1: Build do Next.js
```bash
cd web/
npm install
npm run build
```

#### Passo 2: Configurar Capacitor
```bash
npx @capacitor/cli init \
    --id "com.abzgroup.com.br" \
    --name "TimeSheet Manager"
```

#### Passo 3: Copiar build para projeto Android
```bash
rm -rf android
cp -r web/www android/
cd android
npm install
```

#### Passo 4: Build do APK
```bash
# Sincronizar e build com Capacitor
npx @capacitor/cli sync && npx @capacitor/cli build android

# Ou diretamente com Gradle
gradlew assembleDebug
```

**Local do APK resultante:** `web/android/app/build/outputs/apk/debug/app-debug.apk`

---

### Opção 3: Usando Python Script

O script existente no projeto pode ser usado:

```python
import sys
sys.path.insert(0, 'mobile')
from build_using_python import run_command

# Instalar dependências
run_command('npm install --legacy-peer-deps mobile/', timeout=180)

# Build com Expo
run_command('npx expo run:android mobile/', timeout=600)
```

---

## Diferenças Entre Opções

| Característica | Expo | Capacitor + Next.js |
|---------------|------|---------------------|
| Projeto base | mobile/ | web/ |
| Tempo inicial | ~30-60 min | ~45-75 min |
| APK local | Sim (EAS local) | Precisa configurar Gradle |
| Recomendado para | Início rápido | Integração com app existente |

---

## Pré-requisitos

### Para Expo EAS Build Local
- Node.js 18+
- npm ou yarn
- 10+ GB de espaço em disco (para ferramentas locais)
- Conta Expo gratuita configurada

### Para Capacitor + Next.js
- Node.js 18+
- npm/yarn
- Git
- Gradle (instalado automaticamente pelo Capacitor)

---

## Configuração Necessária

### Arquivo .env
Certifique-se de que o arquivo `.env` existe no projeto com as configurações necessárias:

```env
# Supabase (exemplo)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

---

## Troubleshooting

### Problema: "expo command not found"
**Solução:** Use `npx expo` em vez de `expo` diretamente.

### Problema: Build falha com timeout
**Solução:** Execute em background ou use a opção --timeout aumentado.

### Problema: APK não encontrado
**Solução:** Verifique os locais indicados na seção correspondente da opção usada.

---

## Resumo Rápido

| Queremos | Execute |
|----------|---------|
| Build mais rápido para começar | Opção 1B: `npx expo run:android` |
| Usar projeto Next.js existente | Opção 2 |
| Reutilizar scripts existentes | Opção 3 |

---

## Arquivos de Script Criados

Este diretório contém três scripts de build:

1. `build-apk-expo.sh` / `build-apk-expo.bat` - Expo EAS Build local
2. `build-apk-capacitor.sh` / `build-apk-capacitor.bat` - Capacitor + Next.js
3. `build_using_python.py` - Script Python existente

Todos os scripts podem ser executados diretamente ou de seus subscripts.
