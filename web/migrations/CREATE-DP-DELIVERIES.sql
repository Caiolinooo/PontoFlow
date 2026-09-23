-- ==========================================
-- Departamento Pessoal (Portal ABZ) - fila de entrega de folhas de ponto
-- ==========================================
-- Uma linha por timesheet aprovado. O PDF individual fica no bucket
-- privado 'dp-folhas' sob dp/{centro_custo}/{AAAA-MM}/{colaborador}.pdf.
-- UNIQUE(timesheet_id) torna re-aprovacao/reprocessamento idempotente.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.dp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL UNIQUE REFERENCES public.timesheets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  centro_custo TEXT NOT NULL,
  periodo_ini DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dp_deliveries_tenant_period
  ON public.dp_deliveries (tenant_id, periodo_ini);
CREATE INDEX IF NOT EXISTS idx_dp_deliveries_tenant_cc
  ON public.dp_deliveries (tenant_id, centro_custo);

-- Acesso somente via service role (rotas admin usam getServiceSupabase).
ALTER TABLE public.dp_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.dp_deliveries IS 'Fila de entrega de folhas de ponto ao DP do Portal ABZ, vinculadas por centro de custo';
