# 🚀 Como Executar as Migrations

Este guia explica como executar as migrations de forma segura no Supabase.

## 📋 Migrations Pendentes

As seguintes migrations foram criadas e precisam ser executadas:

1. **phase-20-environment-entries.sql** - Adiciona suporte a ambientes de trabalho nos lançamentos
2. **phase-21-multi-tenant-employees.sql** - Adiciona suporte multi-tenant para colaboradores

## 🔒 Segurança

Todas as migrations usam cláusulas `IF NOT EXISTS` e `OR REPLACE` para garantir que:
- ✅ Não causam erros se objetos já existem
- ✅ Não afetam outros projetos que usam o mesmo Supabase
- ✅ São idempotentes (podem ser executadas múltiplas vezes)

## 📝 Método 1: Supabase Dashboard (Recomendado)

### Passo 1: Acessar o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/arzvingdtnttiejcvucs
2. Faça login com suas credenciais
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar Migration 20

1. Clique em **New Query**
2. Copie todo o conteúdo do arquivo `phase-20-environment-entries.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a confirmação de sucesso

### Passo 3: Executar Migration 21

1. Clique em **New Query** novamente
2. Copie todo o conteúdo do arquivo `phase-21-multi-tenant-employees.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a confirmação de sucesso

## 📝 Método 2: Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# Instalar Supabase CLI (se necessário)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref arzvingdtnttiejcvucs

# Executar migrations
supabase db push --file docs/migrations/phase-20-environment-entries.sql
supabase db push --file docs/migrations/phase-21-multi-tenant-employees.sql
```

## 📝 Método 3: Script Node.js (Alternativo)

**Nota:** Este método requer configuração adicional e pode não funcionar em todos os ambientes.

```bash
node scripts/run-migrations.mjs phase-20-environment-entries.sql
node scripts/run-migrations.mjs phase-21-multi-tenant-employees.sql
```

## ✅ Verificação

Após executar as migrations, verifique se foram aplicadas corretamente:

### Verificar Migration 20 (Ambientes)

Execute no SQL Editor:

```sql
-- Verificar se a coluna environment_id foi adicionada
select column_name, data_type 
from information_schema.columns 
where table_name = 'timesheet_entries' 
  and column_name = 'environment_id';

-- Deve retornar uma linha com:
-- column_name: environment_id
-- data_type: uuid
```

### Verificar Migration 21 (Multi-tenant)

Execute no SQL Editor:

```sql
-- Verificar se o índice foi criado
select indexname 
from pg_indexes 
where tablename = 'employees' 
  and indexname = 'idx_employees_profile_tenant';

-- Verificar se a view foi criada
select viewname 
from pg_views 
where viewname = 'employee_tenants';

-- Verificar se as funções foram criadas
select routine_name 
from information_schema.routines 
where routine_name in (
  'get_user_tenants',
  'set_tenant_context',
  'get_tenant_context'
);
```

## 🐛 Troubleshooting

### Erro: "permission denied"

**Solução:** Certifique-se de estar logado como proprietário do projeto no Supabase Dashboard.

### Erro: "relation already exists"

**Solução:** Isso é normal! As migrations usam `IF NOT EXISTS`, então você pode ignorar este aviso.

### Erro: "syntax error"

**Solução:** 
1. Verifique se copiou todo o conteúdo do arquivo
2. Certifique-se de não ter caracteres especiais ou quebras de linha incorretas
3. Tente executar statement por statement

## 📊 Impacto das Migrations

### Migration 20: Environment Entries

**O que faz:**
- Adiciona coluna `environment_id` na tabela `timesheet_entries`
- Cria índice para melhor performance
- Permite associar lançamentos a ambientes de trabalho

**Impacto:**
- ✅ Não afeta dados existentes
- ✅ Coluna é opcional (nullable)
- ✅ Não quebra funcionalidades existentes

### Migration 21: Multi-Tenant Employees

**O que faz:**
- Cria índice único `idx_employees_profile_tenant`
- Cria view `employee_tenants` para visualização
- Cria funções helper para gerenciar multi-tenant
- Adiciona funções de contexto de tenant

**Impacto:**
- ✅ Não afeta dados existentes
- ✅ Não quebra funcionalidades existentes
- ✅ Permite que colaboradores pertençam a múltiplos tenants

## 🎯 Próximos Passos

Após executar as migrations:

1. ✅ Reinicie o servidor de desenvolvimento (se estiver rodando)
2. ✅ Teste a funcionalidade de ambientes de trabalho
3. ✅ Teste a funcionalidade multi-tenant
4. ✅ Configure o CRON_SECRET no Vercel (para travamento automático de períodos)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Supabase Dashboard
2. Consulte a documentação das migrations nos próprios arquivos SQL
3. Entre em contato com o time de desenvolvimento

---

**Última atualização:** 2025-10-27
**Versão:** 1.0.0

