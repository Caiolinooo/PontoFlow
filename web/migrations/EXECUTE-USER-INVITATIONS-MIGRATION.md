# 🚨 AÇÃO NECESSÁRIA: Executar Migration do Sistema de Convites

## ❌ Problema Identificado

O sistema de convites está apresentando o erro **"Erro ao buscar convites"** porque a tabela `user_invitations` foi **parcialmente criada** (a policy já existe, mas pode estar incompleta).

## ✅ Solução

Execute o script de **limpeza completa e recriação** da tabela.

---

## 📋 Passo a Passo

### **1. Acesse o Supabase Dashboard**

1. Abra: https://supabase.com/dashboard
2. Faça login com sua conta
3. Selecione o projeto: **Timesheet_Project**

### **2. Abra o SQL Editor**

1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### **3. Execute o Script de Fix Completo**

⚠️ **IMPORTANTE**: Use o arquivo `FIX-USER-INVITATIONS-COMPLETE.sql` que faz limpeza completa.

Copie e cole o conteúdo do arquivo `web/migrations/FIX-USER-INVITATIONS-COMPLETE.sql` no editor, ou copie o SQL abaixo:

```sql
-- ============================================================================
-- FIX USER INVITATIONS - COMPLETE CLEANUP AND RECREATION
-- ============================================================================
-- This script safely removes any partial migration and recreates everything
-- ============================================================================

-- Step 1: Drop existing objects (if they exist)
DROP TRIGGER IF EXISTS user_invitations_updated_at ON public.user_invitations;
DROP FUNCTION IF EXISTS update_user_invitations_updated_at();
DROP FUNCTION IF EXISTS expire_old_invitations();
DROP POLICY IF EXISTS user_invitations_admin_all ON public.user_invitations;
DROP INDEX IF EXISTS idx_user_invitations_email;
DROP INDEX IF EXISTS idx_user_invitations_token;
DROP INDEX IF EXISTS idx_user_invitations_status;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- Step 2: Create everything fresh
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  position TEXT,
  department TEXT,
  role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  tenant_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  managed_group_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_invited_by ON public.user_invitations(invited_by);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_unified
      WHERE users_unified.id = auth.uid()
      AND users_unified.role = 'ADMIN'
    )
  );

CREATE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invitations_updated_at();

CREATE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;

COMMENT ON TABLE public.user_invitations IS 'Stores user invitation tokens and pre-configured permissions';
COMMENT ON COLUMN public.user_invitations.token IS 'Unique token for invitation link (UUID v4)';
COMMENT ON COLUMN public.user_invitations.tenant_ids IS 'Array of tenant IDs the user will belong to';
COMMENT ON COLUMN public.user_invitations.group_ids IS 'Array of group IDs the user will belong to';
COMMENT ON COLUMN public.user_invitations.managed_group_ids IS 'Array of group IDs the manager will manage (only for MANAGER roles)';

-- Step 3: Verify creation
SELECT 'user_invitations table created successfully' as status,
       COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_invitations';
```

### **4. Execute o SQL**

1. Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
2. Aguarde a execução (deve levar alguns segundos)
3. Verifique se apareceu **"Success"** com a mensagem de verificação

**Resultado esperado**:
- Deve mostrar "user_invitations table created successfully" com 20 colunas
- Sem erros de "already exists"

---

## 🧪 Teste o Sistema

Após executar a migration:

1. **Recarregue a página** do sistema (Ctrl+Shift+R)
2. **Abra o modal** "Gerenciar Convites"
3. **Verifique** se o erro desapareceu
4. **Crie um convite** de teste
5. **Verifique** se o convite aparece na lista

---

## 📊 O Que Foi Criado

✅ **Tabela**: `user_invitations` (20 colunas)  
✅ **Índices**: 4 índices para performance  
✅ **RLS Policy**: Apenas ADMINs podem ver convites  
✅ **Trigger**: Auto-atualização de `updated_at`  
✅ **Função**: Expirar convites antigos automaticamente  

---

## ❓ Problemas?

Se encontrar algum erro durante a execução:

1. **Copie a mensagem de erro completa**
2. **Me envie** para que eu possa ajudar
3. **Não execute** novamente até resolvermos

---

**Após executar a migration, o sistema de convites funcionará perfeitamente!** ✨
