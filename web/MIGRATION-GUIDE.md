# 🚀 Guia de Migração - Sistema de Convites

## ⚠️ Importante

A migração do banco de dados precisa ser executada **manualmente** no Supabase SQL Editor devido a limitações da API.

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard

1. Abra seu navegador e vá para: https://app.supabase.com
2. Faça login com sua conta
3. Selecione o projeto **Timesheet_Project** (ID: knicakgqydicrvyohcni)

### 2. Abra o SQL Editor

1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New Query** para criar uma nova consulta

### 3. Execute a Migração

1. Abra o arquivo: `web/docs/migrations/user-invitations.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique no botão **Run** (ou pressione Ctrl+Enter)

### 4. Verifique a Execução

Você deve ver uma mensagem de sucesso indicando que:
- ✅ Tabela `user_invitations` foi criada
- ✅ Índices foram criados
- ✅ Políticas RLS foram configuradas
- ✅ Triggers foram criados
- ✅ Função de expiração automática foi criada

### 5. Teste a Tabela

Execute esta query para verificar se a tabela foi criada corretamente:

```sql
SELECT * FROM public.user_invitations LIMIT 1;
```

Você deve ver uma resposta vazia (sem erros), indicando que a tabela existe.

## 🔍 Verificação Adicional

Para verificar se todos os componentes foram criados, execute:

```sql
-- Verificar tabela
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_invitations';

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'user_invitations';

-- Verificar políticas RLS
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'user_invitations';

-- Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'user_invitations';
```

## ✅ Resultado Esperado

Após a migração bem-sucedida, você deve ter:

### Tabela: `user_invitations`
- 18 colunas incluindo id, email, first_name, last_name, role, token, status, etc.

### Índices:
- `idx_user_invitations_email`
- `idx_user_invitations_token`
- `idx_user_invitations_status`
- `idx_user_invitations_invited_by`

### Políticas RLS:
- `user_invitations_admin_all` - Admins podem ver todos os convites
- `user_invitations_admin_insert` - Admins podem criar convites
- `user_invitations_admin_update` - Admins podem atualizar convites
- `user_invitations_admin_delete` - Admins podem deletar convites

### Triggers:
- `user_invitations_updated_at` - Atualiza automaticamente o campo updated_at

### Funções:
- `expire_old_invitations()` - Marca convites expirados automaticamente

## 🐛 Problemas Comuns

### Erro: "relation already exists"
**Solução**: A tabela já foi criada. Você pode pular esta etapa ou executar:
```sql
DROP TABLE IF EXISTS public.user_invitations CASCADE;
```
E então executar a migração novamente.

### Erro: "permission denied"
**Solução**: Certifique-se de estar usando uma conta com permissões de administrador no Supabase.

### Erro: "foreign key constraint"
**Solução**: Certifique-se de que a tabela `users_unified` existe antes de executar a migração.

## 📞 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs de erro no SQL Editor
2. Certifique-se de que todas as tabelas dependentes existem
3. Verifique se você tem permissões adequadas
4. Consulte a documentação completa em `web/docs/USER-INVITATIONS.md`

## 🎉 Próximos Passos

Após a migração bem-sucedida:

1. ✅ Reinicie o servidor de desenvolvimento (se estiver rodando)
2. ✅ Acesse `/admin/users` para ver o novo botão "Convidar Usuário"
3. ✅ Teste o fluxo completo de convite
4. ✅ Verifique se os emails estão sendo enviados corretamente

---

**Data da Migração**: 2025-01-04  
**Versão**: 1.0.0  
**Autor**: Sistema de Convites PontoFlow

