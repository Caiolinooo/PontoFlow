-- ==========================================
-- ADD-EMPLOYEES-DADOS-PESSOAIS.sql (IDEMPOTENTE)
-- Coluna jsonb usada pela Integration API v1 (people.attributes)
-- e pelo merge de atributos no upsert de pessoas.
-- ==========================================
alter table public.employees
  add column if not exists dados_pessoais_json jsonb not null default '{}'::jsonb;
