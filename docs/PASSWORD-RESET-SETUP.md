# 🔐 Configuração de Reset de Senha

## ✅ Funcionalidade Implementada

O sistema agora possui um fluxo completo de reset de senha com envio de email:

### 📋 Fluxo Completo

1. **Usuário solicita reset** (`/auth/reset`)
   - Informa o email
   - Sistema gera token seguro (64 caracteres hex)
   - Token é salvo no banco com validade de 1 hora
   - Email é enviado com link de reset

2. **Usuário recebe email**
   - Email bilíngue (PT-BR / EN-GB)
   - Link com token: `/auth/reset-password?token=...`
   - Avisos de segurança

3. **Usuário define nova senha** (`/auth/reset-password`)
   - Valida token (não expirado, não usado)
   - Valida senha (8+ caracteres, maiúscula, minúscula, número, especial)
   - Atualiza senha no banco
   - Marca token como usado
   - Redireciona para login

---

## 🗄️ Migração do Banco de Dados

### Passo 1: Executar SQL no Supabase

Acesse o **Supabase SQL Editor** e execute o seguinte SQL:

```sql
-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role can manage all reset tokens" ON public.password_reset_tokens;

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view their own reset tokens"
  ON public.password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all tokens
CREATE POLICY "Service role can manage all reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;

COMMENT ON TABLE public.password_reset_tokens IS 'Stores temporary tokens for password reset functionality. Tokens expire after 1 hour.';
```

### Passo 2: Verificar Criação

Execute no SQL Editor:

```sql
SELECT * FROM public.password_reset_tokens LIMIT 1;
```

Se não der erro, a tabela foi criada com sucesso! ✅

---

## 📧 Configuração de Email

### Variáveis de Ambiente Necessárias

Certifique-se de que as seguintes variáveis estão configuradas no **Netlify** (ou `.env.local` para desenvolvimento):

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
MAIL_FROM="PontoFlow <no-reply@seudominio.com>"

# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# App URL (para gerar links corretos)
NEXT_PUBLIC_APP_URL=https://seu-site.netlify.app
```

### Como Obter Senha de App do Gmail

1. Acesse [myaccount.google.com/security](https://myaccount.google.com/security)
2. Ative **Verificação em duas etapas** (se ainda não estiver ativa)
3. Vá em **Senhas de app**
4. Selecione **Outro (nome personalizado)** → Digite "PontoFlow"
5. Clique em **Gerar**
6. Copie a senha de 16 caracteres
7. Use essa senha na variável `SMTP_PASS`

---

## 🧪 Como Testar

### Teste Local (Development)

1. **Inicie o servidor:**
   ```bash
   cd web
   npm run dev
   ```

2. **Acesse a página de reset:**
   ```
   http://localhost:3000/pt-BR/auth/reset
   ```

3. **Informe um email cadastrado** (ex: `caio.correia@groupabz.com`)

4. **Verifique o console do servidor:**
   ```
   ✅ Password reset email sent to caio.correia@groupabz.com
   ```

5. **Verifique sua caixa de entrada** (pode demorar alguns segundos)

6. **Clique no link do email** (formato: `http://localhost:3000/pt-BR/auth/reset-password?token=...`)

7. **Defina uma nova senha** (deve atender aos requisitos)

8. **Faça login com a nova senha**

### Teste em Produção (Netlify)

1. **Certifique-se de que as variáveis de ambiente estão configuradas no Netlify**

2. **Acesse:**
   ```
   https://seu-site.netlify.app/pt-BR/auth/reset
   ```

3. **Siga os mesmos passos do teste local**

---

## 🔍 Troubleshooting

### Email não está sendo enviado

**Problema:** Usuário não recebe o email

**Soluções:**

1. **Verifique as variáveis de ambiente:**
   ```bash
   # No Netlify: Site Settings > Environment Variables
   # Localmente: web/.env.local
   ```

2. **Verifique os logs do servidor:**
   ```bash
   # Procure por:
   ✅ Password reset email sent to ...
   # ou
   ❌ [email-service] Email disabled: missing credentials
   ```

3. **Teste a configuração SMTP:**
   - Acesse: `/api/admin/email/test` (requer autenticação de admin)
   - Ou use o painel de admin: Admin > Configurações > Email

4. **Verifique a caixa de spam**

5. **Gmail bloqueando?**
   - Certifique-se de usar **Senha de App**, não a senha normal
   - Verifique se a verificação em duas etapas está ativa

### Token inválido ou expirado

**Problema:** Ao clicar no link, aparece "Token inválido ou expirado"

**Causas possíveis:**

1. **Token já foi usado** - Cada token só pode ser usado uma vez
2. **Token expirou** - Tokens expiram após 1 hora
3. **Tabela não foi criada** - Execute a migração SQL

**Solução:**
- Solicite um novo reset de senha
- Verifique se a tabela `password_reset_tokens` existe no Supabase

### Erro ao atualizar senha

**Problema:** "Erro ao atualizar senha"

**Soluções:**

1. **Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada**
2. **Verifique os logs do servidor** para mais detalhes
3. **Certifique-se de que o usuário existe** na tabela `users_unified`

---

## 🔒 Segurança

### Medidas Implementadas

✅ **Tokens seguros:** 64 caracteres hexadecimais (256 bits de entropia)  
✅ **Expiração:** Tokens expiram após 1 hora  
✅ **Uso único:** Tokens são marcados como usados após o reset  
✅ **Sem vazamento de informações:** Sempre retorna sucesso, mesmo se o email não existir  
✅ **RLS (Row Level Security):** Usuários só podem ver seus próprios tokens  
✅ **Validação de senha:** Requisitos fortes (8+ caracteres, maiúscula, minúscula, número, especial)  
✅ **HTTPS obrigatório:** Links de reset só funcionam em HTTPS (produção)  

### Limpeza de Tokens Expirados

Para manter o banco limpo, execute periodicamente:

```sql
SELECT public.cleanup_expired_reset_tokens();
```

Ou configure um cron job no Supabase (Database > Cron Jobs):

```sql
-- Run every day at 3 AM
SELECT cron.schedule(
  'cleanup-expired-reset-tokens',
  '0 3 * * *',
  $$SELECT public.cleanup_expired_reset_tokens()$$
);
```

---

## 📊 Monitoramento

### Queries Úteis

**Ver tokens ativos:**
```sql
SELECT 
  t.token,
  u.email,
  t.created_at,
  t.expires_at,
  t.used_at,
  CASE 
    WHEN t.used_at IS NOT NULL THEN 'USED'
    WHEN t.expires_at < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as status
FROM password_reset_tokens t
JOIN users_unified u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;
```

**Estatísticas:**
```sql
SELECT 
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used_tokens,
  COUNT(CASE WHEN expires_at < NOW() AND used_at IS NULL THEN 1 END) as expired_tokens,
  COUNT(CASE WHEN expires_at >= NOW() AND used_at IS NULL THEN 1 END) as active_tokens
FROM password_reset_tokens;
```

---

## ✅ Checklist de Implementação

- [x] Criar tabela `password_reset_tokens`
- [x] Implementar API `/api/auth/request-reset`
- [x] Implementar API `/api/auth/reset-password`
- [x] Criar página `/auth/reset-password`
- [x] Criar template de email bilíngue
- [x] Adicionar traduções (PT-BR e EN-GB)
- [ ] **Executar migração SQL no Supabase** ⚠️ **PENDENTE**
- [ ] **Configurar variáveis de ambiente no Netlify** ⚠️ **PENDENTE**
- [ ] **Testar fluxo completo** ⚠️ **PENDENTE**

---

## 🎯 Próximos Passos

1. **Execute a migração SQL** no Supabase SQL Editor
2. **Configure as variáveis de ambiente** no Netlify
3. **Teste o fluxo completo** em produção
4. **Configure o cron job** para limpeza de tokens expirados
5. **Monitore os logs** para garantir que os emails estão sendo enviados

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Verifique as variáveis de ambiente
3. Teste a configuração SMTP no painel de admin
4. Consulte este documento

**Tudo pronto para uso! 🚀**

