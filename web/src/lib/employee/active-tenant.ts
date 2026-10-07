export type EmployeeTenantRow = {
  id: string;
  tenant_id: string;
  work_mode: string | null;
};

/**
 * Cookie de troca de tenant ganha. Sem cookie, o ponto diário (work_mode
 * standard/padrao) ganha do offshore, senão a lista mostra embarque no lugar
 * de entrada, saída e almoço.
 */
export function pickActiveEmployee(
  rows: EmployeeTenantRow[],
  cookieTenantId?: string | null
): EmployeeTenantRow | null {
  if (rows.length === 0) return null;
  if (cookieTenantId) {
    const chosen = rows.find((row) => row.tenant_id === cookieTenantId);
    if (chosen) return chosen;
  }
  return (
    rows.find((row) => row.work_mode === 'standard' || row.work_mode === 'padrao') ??
    rows[0]
  );
}
