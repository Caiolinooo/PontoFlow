import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Autenticação do app via Portal ABZ (decisão B: credencial do portal).
 *
 * Fluxo:
 *  1. POST {PORTAL}/api/auth/login {email, password, rememberMe} -> { token, refreshToken, user }
 *     (contrato real do portal: rota src/app/api/auth/login/route.ts — sucesso 200 com `token`,
 *      erro 401 com `{ error }`; sem wrapper { success } no caminho de senha)
 *  2. POST {PORTAL}/api/pontoflow/sso (Bearer token) -> { success, data: { url } }
 *  3. Abrir `url` em WebView; o TS seta o cookie httpOnly `timesheet_session`,
 *     capturado via CookieManager nativo e persistido aqui para sessões futuras.
 *
 * A URL do portal é configurável por EXPO_PUBLIC_PORTAL_URL; o default é produção.
 */

// Domínio de produção do portal (confirmado: /api/config em portal.groupabz.com).
const DEFAULT_PORTAL_URL = 'https://portal.groupabz.com';

export const PORTAL_BASE_URL = (
  process.env.EXPO_PUBLIC_PORTAL_URL || DEFAULT_PORTAL_URL
).replace(/\/+$/, '');

const K_TOKEN = 'pontoflow.portal.token';
const K_REFRESH = 'pontoflow.portal.refresh';
const K_USER = 'pontoflow.portal.user';
const K_TS_ORIGIN = 'pontoflow.ts.origin';
const K_TS_SESSION = 'pontoflow.ts.session';
const K_BIOMETRIC = 'pontoflow.biometric';

export const TS_SESSION_COOKIE = 'timesheet_session';

export interface PortalSession {
  token: string;
  refreshToken: string | null;
  user: { id?: string; email?: string; name?: string; role?: string } | null;
}

export class PortalUnauthorizedError extends Error {
  constructor(message = 'Sessão do portal expirada') {
    super(message);
    this.name = 'PortalUnauthorizedError';
  }
}

/** Login no portal com email + senha (rememberMe: token de 7 dias). */
export async function portalLogin(email: string, password: string): Promise<PortalSession> {
  const res = await fetch(`${PORTAL_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password, rememberMe: true }),
  });
  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.token) {
    throw new Error(body?.error || 'Email ou senha incorretos.');
  }
  return {
    token: body.token as string,
    refreshToken: (body.refreshToken as string) ?? null,
    user: body.user ?? null,
  };
}

/** Pede ao portal um link SSO de uso único (60s) para a tela de ponto do Time-Sheet. */
export async function requestSsoUrl(portalToken: string): Promise<string> {
  const res = await fetch(`${PORTAL_BASE_URL}/api/pontoflow/sso`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${portalToken}`,
    },
  });
  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new PortalUnauthorizedError();
  }
  const url: string | undefined = body?.data?.url ?? body?.url;
  if (!res.ok || !url) {
    throw new Error(
      body?.error || body?.message || `Não foi possível abrir o Time Sheet (HTTP ${res.status}).`
    );
  }
  return url;
}

// ---------- Persistência (SecureStore) ----------

export async function savePortalSession(session: PortalSession): Promise<void> {
  await SecureStore.setItemAsync(K_TOKEN, session.token);
  if (session.refreshToken) {
    await SecureStore.setItemAsync(K_REFRESH, session.refreshToken);
  }
  if (session.user) {
    await SecureStore.setItemAsync(K_USER, JSON.stringify(session.user));
  }
}

export async function getPortalToken(): Promise<string | null> {
  return SecureStore.getItemAsync(K_TOKEN);
}

export async function getPortalUser(): Promise<PortalSession['user']> {
  const raw = await SecureStore.getItemAsync(K_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface StoredTimesheetSession {
  origin: string;
  cookieValue: string;
}

export async function saveTimesheetSession(origin: string, cookieValue: string): Promise<void> {
  await SecureStore.setItemAsync(K_TS_ORIGIN, origin);
  await SecureStore.setItemAsync(K_TS_SESSION, cookieValue);
}

export async function getStoredTimesheetSession(): Promise<StoredTimesheetSession | null> {
  const [origin, cookieValue] = await Promise.all([
    SecureStore.getItemAsync(K_TS_ORIGIN),
    SecureStore.getItemAsync(K_TS_SESSION),
  ]);
  return origin && cookieValue ? { origin, cookieValue } : null;
}

export async function clearPortalSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(K_TOKEN),
    SecureStore.deleteItemAsync(K_REFRESH),
    SecureStore.deleteItemAsync(K_USER),
    SecureStore.deleteItemAsync(K_TS_ORIGIN),
    SecureStore.deleteItemAsync(K_TS_SESSION),
  ]);
  setPortalUnlocked(false);
}

/** Extrai a origem (scheme://host[:port]) de uma URL sem depender de polyfill de URL. */
export function originOf(url: string): string | null {
  const m = url.match(/^https?:\/\/[^/]+/i);
  return m ? m[0] : null;
}

// ---------- Biometria (unlock local do token persistido) ----------

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(K_BIOMETRIC)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(K_BIOMETRIC, '1');
  } else {
    await SecureStore.deleteItemAsync(K_BIOMETRIC);
  }
}

export async function authenticateWithBiometrics(promptMessage = 'Desbloquear PontoFlow'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}

// ---------- Estado em memória: sessão do portal desbloqueada neste processo ----------

let portalUnlocked = false;
const unlockedListeners = new Set<(v: boolean) => void>();

export function setPortalUnlocked(v: boolean): void {
  portalUnlocked = v;
  unlockedListeners.forEach((l) => l(v));
}

export function onPortalUnlockedChange(listener: (v: boolean) => void): () => void {
  unlockedListeners.add(listener);
  return () => {
    unlockedListeners.delete(listener);
  };
}

/**
 * Restaura a sessão do portal no cold start. Se biometria estiver habilitada,
 * exige o unlock local antes de considerar a sessão autenticada.
 */
export async function restorePortalSession(): Promise<boolean> {
  const token = await getPortalToken();
  if (!token) {
    setPortalUnlocked(false);
    return false;
  }
  if (await isBiometricEnabled()) {
    const ok = await authenticateWithBiometrics();
    setPortalUnlocked(ok);
    return ok;
  }
  setPortalUnlocked(true);
  return true;
}
