import { isApplicationAdmin } from '@/lib/auth/roles';

/** Reset of a stored face template. Platform ADMIN only. TENANT_ADMIN does not qualify. */
export function canResetBiometrics(role: string | null | undefined): boolean {
  return isApplicationAdmin(role);
}
