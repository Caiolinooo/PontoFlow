/**
 * Papéis de aplicação (JWT, dashboard, /admin) versus papéis gravados
 * em tenant_user_roles (ADMIN_GLOBAL, GERENTE, COLAB).
 */
export type AppRole = 'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER' | 'TENANT_ADMIN';

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: 'ADMIN',
  ADMIN_GLOBAL: 'ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  MANAGER: 'MANAGER',
  GERENTE: 'MANAGER',
  MANAGER_TIMESHEET: 'MANAGER_TIMESHEET',
  USER: 'USER',
  COLAB: 'USER',
  EMPLOYEE: 'USER',
};

const RANK: Record<AppRole, number> = {
  USER: 0,
  MANAGER_TIMESHEET: 1,
  MANAGER: 2,
  TENANT_ADMIN: 3,
  ADMIN: 4,
};

export function toAppRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  const key = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[key] ?? null;
}

/** Maior papel presente nas fontes. Sem fonte conhecida, USER. */
export function resolveAppRole(...candidates: Array<string | null | undefined>): AppRole {
  let best: AppRole = 'USER';
  for (const candidate of candidates) {
    const mapped = toAppRole(candidate);
    if (mapped && RANK[mapped] > RANK[best]) best = mapped;
  }
  return best;
}

/** Admin global da aplicação. TENANT_ADMIN não entra. */
export function isApplicationAdmin(role: string | null | undefined): boolean {
  return toAppRole(role) === 'ADMIN';
}
