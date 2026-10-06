-- ==========================================
-- CANONICAL-SCHEMA-ALIGN.sql (IDEMPOTENTE)
-- ==========================================
-- Congela o vocabulário canônico do produto:
--   timesheets.status:  'rascunho','enviado','aprovado','recusado','bloqueado'
--   timesheet_entries.tipo: 'normal','extra','feriado','folga'
--   approvals.status:   'aprovado','recusado'
-- e alinha as 3 versões existentes desses CHECKs:
--   setup-wizard/07-layer-06 (pt, canônico)
--   ADD-TENANT-NAME-FIELD    (tipo 4 valores)
--   ADD-INTEGRATION-INFRASTRUCTURE (status em EN + tipo 5 valores com 'outro')
--
-- Também alinha as colunas de `approvals` com o shape usado pelo código
-- (tenant_id, timesheet_id, manager_id, status, mensagem), fazendo
-- backfill a partir das colunas legadas do setup-wizard/08-layer-07
-- (approver_id, action, comentario) quando presentes.
--
-- Seguro para reexecução: dados em EN são migrados para PT antes de
-- recriar os CHECKs (adicionados NOT VALID para nunca quebrar em linhas
-- fora do vocabulário legado).
-- ==========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- ========================================
  -- 1) timesheets.status -> vocabulário PT
  -- ========================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'timesheets'
  ) THEN
    -- Remove CHECKs antigos que envolvam a coluna status ANTES de
    -- migrar os dados (o CHECK legado em EN rejeitaria os valores PT).
    FOR r IN
      SELECT DISTINCT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE n.nspname = 'public' AND t.relname = 'timesheets'
        AND c.contype = 'c' AND a.attname = 'status'
    LOOP
      EXECUTE format('ALTER TABLE public.timesheets DROP CONSTRAINT %I', r.conname);
    END LOOP;

    -- Migra dados legados EN -> PT
    UPDATE public.timesheets SET status = 'rascunho' WHERE status = 'draft';
    UPDATE public.timesheets SET status = 'enviado'  WHERE status = 'submitted';
    UPDATE public.timesheets SET status = 'aprovado' WHERE status = 'approved';
    UPDATE public.timesheets SET status = 'recusado' WHERE status = 'rejected';
    UPDATE public.timesheets SET status = 'bloqueado' WHERE status = 'locked';

    -- CHECK canônico (NOT VALID: linhas fora do vocabulário legado não bloqueiam)
    ALTER TABLE public.timesheets
      ADD CONSTRAINT timesheets_status_check
      CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'bloqueado'))
      NOT VALID;
  END IF;

  -- ========================================
  -- 2) timesheet_entries.tipo -> 4 valores canônicos
  -- ========================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'timesheet_entries'
  ) THEN
    -- 'outro' existia apenas na versão do setup-wizard; o produto usa 4 tipos
    UPDATE public.timesheet_entries SET tipo = 'normal' WHERE tipo = 'outro';

    FOR r IN
      SELECT DISTINCT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE n.nspname = 'public' AND t.relname = 'timesheet_entries'
        AND c.contype = 'c' AND a.attname = 'tipo'
    LOOP
      EXECUTE format('ALTER TABLE public.timesheet_entries DROP CONSTRAINT %I', r.conname);
    END LOOP;

    ALTER TABLE public.timesheet_entries
      ADD CONSTRAINT timesheet_entries_tipo_check
      CHECK (tipo IN ('normal', 'extra', 'feriado', 'folga'))
      NOT VALID;

    ALTER TABLE public.timesheet_entries ALTER COLUMN tipo SET DEFAULT 'normal';
  END IF;

  -- ========================================
  -- 3) approvals: colunas canônicas usadas pelo código
  -- ========================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'approvals'
  ) THEN
    ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS manager_id UUID;
    ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS mensagem TEXT;

    -- Backfill a partir das colunas legadas do setup-wizard/08-layer-07
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'approvals' AND column_name = 'approver_id'
    ) THEN
      UPDATE public.approvals SET manager_id = approver_id WHERE manager_id IS NULL;
      -- O código grava manager_id; a coluna legada não pode continuar NOT NULL
      ALTER TABLE public.approvals ALTER COLUMN approver_id DROP NOT NULL;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'approvals' AND column_name = 'action'
    ) THEN
      UPDATE public.approvals SET status = action WHERE status IS NULL;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'approvals' AND column_name = 'comentario'
    ) THEN
      UPDATE public.approvals SET mensagem = comentario WHERE mensagem IS NULL;
    END IF;

    -- CHECK canônico de approvals.status
    FOR r IN
      SELECT DISTINCT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE n.nspname = 'public' AND t.relname = 'approvals'
        AND c.contype = 'c' AND a.attname = 'status'
    LOOP
      EXECUTE format('ALTER TABLE public.approvals DROP CONSTRAINT %I', r.conname);
    END LOOP;

    ALTER TABLE public.approvals
      ADD CONSTRAINT approvals_status_check
      CHECK (status IN ('aprovado', 'recusado'))
      NOT VALID;
  END IF;
END $$;

-- Tenta validar os CHECKs canônicos; se houver linhas legadas fora do
-- vocabulário, o constraint permanece NOT VALID (continua valendo para
-- novas escritas) e esta migration NÃO falha.
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.timesheets VALIDATE CONSTRAINT timesheets_status_check;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'timesheets_status_check permanece NOT VALID: %', SQLERRM;
  END;
  BEGIN
    ALTER TABLE public.timesheet_entries VALIDATE CONSTRAINT timesheet_entries_tipo_check;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'timesheet_entries_tipo_check permanece NOT VALID: %', SQLERRM;
  END;
  BEGIN
    ALTER TABLE public.approvals VALIDATE CONSTRAINT approvals_status_check;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'approvals_status_check permanece NOT VALID: %', SQLERRM;
  END;
END $$;
