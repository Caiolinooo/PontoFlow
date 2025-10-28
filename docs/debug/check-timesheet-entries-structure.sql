-- Script para verificar a estrutura da tabela timesheet_entries
-- Execute este script no Supabase SQL Editor para diagnosticar problemas

-- 1. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'timesheet_entries'
ORDER BY ordinal_position;

-- 2. Verificar constraints e foreign keys
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'timesheet_entries';

-- 3. Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'timesheet_entries';

-- 4. Verificar se há entradas sem environment_id
SELECT 
    COUNT(*) as total_entries,
    COUNT(environment_id) as entries_with_environment,
    COUNT(*) - COUNT(environment_id) as entries_without_environment
FROM public.timesheet_entries;

-- 5. Verificar se há entradas com environment_id inválido
SELECT 
    te.id,
    te.data,
    te.environment_id,
    te.timesheet_id
FROM public.timesheet_entries te
LEFT JOIN public.environments e ON te.environment_id = e.id
WHERE te.environment_id IS NOT NULL
  AND e.id IS NULL
LIMIT 10;

-- 6. Verificar políticas RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'timesheet_entries';

-- 7. Testar inserção manual (ajuste os valores conforme necessário)
-- IMPORTANTE: Comente esta seção se não quiser inserir dados de teste
/*
INSERT INTO public.timesheet_entries (
    tenant_id,
    timesheet_id,
    data,
    environment_id,
    hora_ini,
    hora_fim,
    observacao
) VALUES (
    '2376edb6-bcda-47f6-a0c7-cecd701298ca', -- tenant_id (ajuste conforme necessário)
    '3a2ff8f1-abee-4714-9e63-0db7a99f4b50', -- timesheet_id (ajuste conforme necessário)
    '2025-10-07',
    'a516b6a1-c257-4690-bc10-8ac6001b5cba', -- environment_id (ajuste conforme necessário)
    '09:15',
    NULL,
    NULL
) RETURNING *;
*/

-- 8. Verificar se o environment_id existe
SELECT 
    e.id,
    e.name,
    e.slug,
    e.tenant_id,
    t.name as tenant_name
FROM public.environments e
JOIN public.tenants t ON e.tenant_id = t.id
WHERE e.id = 'a516b6a1-c257-4690-bc10-8ac6001b5cba';

-- 9. Verificar se o timesheet existe e pertence ao tenant correto
SELECT 
    ts.id,
    ts.tenant_id,
    ts.employee_id,
    ts.periodo_ini,
    ts.periodo_fim,
    e.profile_id,
    t.name as tenant_name
FROM public.timesheets ts
JOIN public.employees e ON ts.employee_id = e.id
JOIN public.tenants t ON ts.tenant_id = t.id
WHERE ts.id = '3a2ff8f1-abee-4714-9e63-0db7a99f4b50';

-- 10. Verificar se há conflito de tenant_id entre timesheet e environment
SELECT 
    ts.id as timesheet_id,
    ts.tenant_id as timesheet_tenant_id,
    e.id as environment_id,
    e.tenant_id as environment_tenant_id,
    CASE 
        WHEN ts.tenant_id = e.tenant_id THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as tenant_match
FROM public.timesheets ts
CROSS JOIN public.environments e
WHERE ts.id = '3a2ff8f1-abee-4714-9e63-0db7a99f4b50'
  AND e.id = 'a516b6a1-c257-4690-bc10-8ac6001b5cba';

