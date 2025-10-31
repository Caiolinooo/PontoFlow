# 🚀 Guia Rápido - Executar Migrations

## ⚡ Método Mais Rápido (5 minutos)

### Passo 1: Abrir Supabase Dashboard
```
https://supabase.com/dashboard/project/arzvingdtnttiejcvucs/sql/new
```

### Passo 2: Copiar e Colar

1. Abra o arquivo: `docs/migrations/EXECUTE-ALL-PENDING.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique em **Run** (ou Ctrl+Enter)

### Passo 3: Aguardar Confirmação

Você verá uma mensagem de sucesso no canto inferior direito.

### ✅ Pronto!

As migrations foram executadas com sucesso!

---

## 🔍 Verificação Rápida

Execute esta query no SQL Editor para verificar:

```sql
-- Verificar se tudo foi criado
select 
  (select count(*) from information_schema.columns 
   where table_name = 'timesheet_entries' and column_name = 'environment_id') as env_column,
  (select count(*) from pg_indexes 
   where tablename = 'employees' and indexname = 'idx_employees_profile_tenant') as multi_tenant_index,
  (select count(*) from pg_views where viewname = 'employee_tenants') as employee_view,
  (select count(*) from information_schema.routines 
   where routine_name = 'get_user_tenants') as get_tenants_func;

-- Resultado esperado:
-- env_column: 1
-- multi_tenant_index: 1
-- employee_view: 1
-- get_tenants_func: 1
```

---

## 🎯 Próximos Passos

1. **Reiniciar o servidor de desenvolvimento:**
   ```bash
   cd web
   npm run dev
   ```

2. **Testar funcionalidades:**
   - ✅ Criar lançamento com ambiente de trabalho
   - ✅ Adicionar colaborador a múltiplos tenants
   - ✅ Trocar entre tenants no timesheet

3. **Configurar CRON_SECRET no Vercel:**
   ```bash
   # Gerar um secret aleatório
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Adicionar no Vercel
   vercel env add CRON_SECRET
   ```

---

## ❓ Problemas?

### "permission denied"
**Solução:** Faça login como proprietário do projeto no Supabase.

### "relation already exists"
**Solução:** Ignore! As migrations são idempotentes.

### Outro erro?
**Solução:** Consulte `docs/migrations/RUN-MIGRATIONS.md` para mais detalhes.

---

**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil ⭐  
**Segurança:** ✅ Seguro para outros projetos

