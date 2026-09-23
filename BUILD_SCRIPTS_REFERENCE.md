# Scripts de Build - TimeSheet Manager

## Visão Geral dos Métodos de Build

### Método 1: Capacitor + Next.js (Recomendado para Build Local)

#### Script Unix/Linux
```bash
./build-apk-capacitor.sh
```

#### Script Windows
```cmd
web\build-capacitor.bat
```

**Processo:**
1. Instalar dependências (`npm install`)
2. Build da aplicação Next.js (`npm run build`)
3. Inicializar/configurar Capacitor
4. Copiar output do build para `android/www/`
5. Sync e build do APK

**APK final:** `web/android/app/build/outputs/apk/debug/app-debug.apk`

---

### Método 2: Expo EAS Build (Cloud/Local)

#### Script Unix/Linux
```bash
./build-apk-expo.sh
```

#### Script Windows
```cmd
mobile\build-android.bat
```

**Processo:**
1. Instalar dependências (`npm install --legacy-peer-deps`)
2. Configuração do ambiente Expo
3. Build local com EAS CLI

**APK final:** `~/Library/Cache/EAS Build/` (ou cache do projeto)

---

## Dificuldades Encontradas

### 1. Build Next.js com Warnings
O build foi bem-sucedido com warnings menores:
- Módulos não encontrados em `@tensorflow/tfjs-core`
- Uso dinâmico do servidor na build estática
- These are non-critical and don't prevent compilation

### 2. Capacitor Initialization
O comando `npx @capacitor/cli init` com flags automáticas falhou no Windows.
Solução: Script novo `build-capacitor.bat` que lida melhor com isso.

### 3. Falha no Build EAS
Erro: conta Expo requerida (`EXPO_TOKEN` ou login)
- Não há token configurado
- Login não realizado

---

## Próximos Passos Recomendados

1. **Para build rápido de teste:** Use o método Capacitor local
2. **Para build profissional:** Configure EAS Build com conta Expo
3. **Para desenvolvimento contínuo:** Execute servidor dev + Capacitor sync

---

## Estrutura do Projeto Mobile

O projeto tem duas abordagens possíveis:
- `web/` - Aplicação Next.js que serve como fonte para Capacitor
- `mobile/` - Aplicação Expo/React Native nativa

Os scripts atuais focam em usar o diretório `web/` com Capacitor.
