# 🔒 Gerenciamento de Secrets e Segurança

## ✅ Status Atual da Segurança

### Secrets NÃO estão no Git
- ✅ Arquivos `.env*` estão no `.gitignore`
- ✅ Nenhum arquivo `.env` foi commitado no histórico do git
- ✅ Apenas `.env.example` está no repositório (sem valores reais)
- ✅ Código não contém secrets hardcoded

### Correções Aplicadas
1. **Arquivo `CONFIGURATION_ANALYSIS_REPORT.md`**: Removido a chave Supabase Anon Key exposta
2. **Arquivo `netlify.toml`**: Configurado para ignorar variáveis públicas no scan de secrets

---

## 🔑 Tipos de Variáveis de Ambiente

### Variáveis PÚBLICAS (Prefixo `NEXT_PUBLIC_`)
Estas variáveis são **intencionalmente expostas** ao cliente (navegador):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR
NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB
```

**Por que são seguras?**
- A Anon Key do Supabase é protegida por Row Level Security (RLS)
- VAPID Public Key é necessária para Web Push Notifications
- Locales são apenas configurações de idioma

### Variáveis PRIVADAS (Servidor apenas)
Estas variáveis **NUNCA** devem ser expostas ao cliente:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
VAPID_PRIVATE_KEY=your-vapid-private-key
```

**⚠️ NUNCA adicione o prefixo `NEXT_PUBLIC_` a estas variáveis!**

---

## 📋 Configuração no Netlify

### Passo 1: Adicionar Variáveis de Ambiente

No painel do Netlify:
1. Vá em **Site settings** → **Environment variables**
2. Adicione as seguintes variáveis:

#### Variáveis Públicas
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY = your-vapid-public-key
NEXT_PUBLIC_DEFAULT_LOCALE = pt-BR
NEXT_PUBLIC_AVAILABLE_LOCALES = pt-BR,en-GB
```

#### Variáveis Privadas (Servidor)
```
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-password
MAIL_FROM = "PontoFlow <no-reply@yourdomain.com>"
VAPID_PRIVATE_KEY = your-vapid-private-key
NODE_ENV = production
```

### Passo 2: Configurar Secrets Scanning

O arquivo `netlify.toml` já está configurado para:
- Ignorar variáveis públicas no scan de secrets
- Ignorar caminhos de build (`.netlify/`, `.next/`, etc.)

---

## 🛡️ Melhores Práticas

### ✅ O que FAZER

1. **Sempre use `.env.local` para desenvolvimento local**
   ```bash
   cp .env.example .env.local
   # Edite .env.local com seus valores reais
   ```

2. **Configure variáveis no painel do Netlify/Vercel**
   - Nunca commite arquivos `.env` com valores reais
   - Use o painel de administração da plataforma

3. **Use diferentes valores para cada ambiente**
   - Desenvolvimento: `.env.local`
   - Staging: Variáveis no painel do Netlify
   - Produção: Variáveis no painel do Netlify

4. **Rotacione secrets regularmente**
   - Troque senhas SMTP a cada 3-6 meses
   - Regenere VAPID keys se houver suspeita de exposição
   - Monitore logs de acesso do Supabase

### ❌ O que NÃO FAZER

1. **NUNCA commite arquivos `.env` com valores reais**
   ```bash
   # ❌ ERRADO
   git add .env.local
   git commit -m "Add env file"
   ```

2. **NUNCA exponha Service Role Key no cliente**
   ```javascript
   // ❌ ERRADO
   const NEXT_PUBLIC_SUPABASE_SERVICE_KEY = "..."
   ```

3. **NUNCA coloque secrets em documentação**
   ```markdown
   <!-- ❌ ERRADO -->
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **NUNCA compartilhe secrets por email/chat**
   - Use ferramentas seguras como 1Password, LastPass, ou Bitwarden
   - Compartilhe apenas com pessoas autorizadas

---

## 🔍 Como Verificar se Há Secrets Expostos

### Verificar arquivos no git
```bash
# Verificar se há arquivos .env commitados
git ls-files | grep "\.env"

# Deve retornar apenas:
# .env.example
```

### Verificar histórico do git
```bash
# Procurar por secrets no histórico
git log --all --full-history -- "**/.env*"

# Não deve retornar nada (exceto .env.example)
```

### Verificar código por secrets hardcoded
```bash
# Procurar por possíveis secrets no código
git grep -i "password\|secret\|key" -- "*.ts" "*.tsx" "*.js" "*.jsx"

# Revisar resultados manualmente
```

---

## 🚨 O que Fazer se um Secret Foi Exposto

### 1. Remover do Git Imediatamente
```bash
# Remover arquivo do histórico do git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

# Forçar push (CUIDADO!)
git push origin --force --all
```

### 2. Rotacionar o Secret
- **Supabase**: Regenerar Service Role Key no painel do Supabase
- **SMTP**: Trocar senha do email
- **VAPID**: Gerar novas chaves com `npx web-push generate-vapid-keys`

### 3. Atualizar em Todos os Ambientes
- Atualizar `.env.local` local
- Atualizar variáveis no Netlify/Vercel
- Notificar equipe sobre a mudança

---

## 📚 Recursos Adicionais

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## ✅ Checklist de Segurança

- [x] Arquivos `.env*` estão no `.gitignore`
- [x] Nenhum secret no histórico do git
- [x] Código não contém secrets hardcoded
- [x] Documentação não contém secrets reais
- [x] Netlify configurado para ignorar variáveis públicas
- [ ] Variáveis configuradas no painel do Netlify
- [ ] Secrets rotacionados regularmente
- [ ] Equipe treinada em melhores práticas

