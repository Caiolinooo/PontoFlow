import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function toBase64(str: string): string {
  // Use Web API in Edge/browser; fallback to Node Buffer on server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (typeof g.btoa === 'function') return g.btoa(str);
  // Node.js fallback
  // @ts-ignore - Buffer may not exist in Edge, but this branch won't run there
  return Buffer.from(str, 'utf-8').toString('base64');
}

function fromBase64(str: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (typeof g.atob === 'function') return g.atob(str);
  // @ts-ignore
  return Buffer.from(str, 'base64').toString('utf-8');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: 'ADMIN' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'USER';
  tenant_id?: string;
  phone_number: string;
  position: string;
  department: string;
  active: boolean;
  avatar?: string;
  drive_photo_url?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

/**
 * Authenticate user using the users_unified table
 */
export async function signInWithCredentials(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log('[AUTH] Attempting login for:', normalizedEmail);

    // Query the users_unified table
    const { data: user, error } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('active', true)
      .single();

    if (error || !user) {
      console.log('[AUTH] User not found or error:', error?.message);
      return { error: 'Credenciais inválidas' };
    }

    console.log('[AUTH] User found:', user.email, 'Role:', user.role, 'Active:', user.active);

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      console.log('[AUTH] Account locked until:', user.lock_until);
      if (process.env.NODE_ENV === 'production') {
        return { error: 'Conta bloqueada temporariamente. Tente novamente mais tarde.' };
      } else {
        console.log('[AUTH] Dev mode: bypassing lock for testing');
      }
    }

    // Verify password (supports password_hash and legacy password field)
    const candidates: Array<{ value: string; source: 'password_hash' | 'password' }> = [];
    if ((user as any).password_hash) candidates.push({ value: (user as any).password_hash as string, source: 'password_hash' });
    if ((user as any).password) candidates.push({ value: (user as any).password as string, source: 'password' });

    if (candidates.length === 0) {
      console.log('[AUTH] No password hash found on record (password_hash/password)');
      return { error: 'Senha não configurada. Entre em contato com o administrador.' };
    }

    console.log('[AUTH] Comparing password against available hashes...');
    let isValidPassword = false;
    let matchedLegacyPlaintext = false;
    let matchSource: 'password_hash' | 'password' | 'supabase_auth' | null = null;
    for (const cand of candidates) {
      try {
        const value = cand.value;
        const looksLikeBcrypt = typeof value === 'string' && value.startsWith('$2');
        if (looksLikeBcrypt) {
          if (await bcrypt.compare(password, value)) {
            isValidPassword = true;
            matchSource = cand.source;
            break;
          }
        } else {
          // Legacy fallback: plaintext stored (migration path)
          if (password === value) {
            isValidPassword = true;
            matchedLegacyPlaintext = true;
            matchSource = cand.source;
            break;
          }
        }
      } catch (e) {
        console.warn('[AUTH] bcrypt.compare failed for one hash candidate:', (e as Error).message);
      }
    }
    console.log('[AUTH] Password valid:', isValidPassword, 'legacyPlaintext:', matchedLegacyPlaintext, 'source:', matchSource);

    // Fallback: try Supabase Auth if our table hash check failed
    if (!isValidPassword) {
      try {
        const authRes = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (authRes.data?.user && !authRes.error) {
          isValidPassword = true;
          matchSource = 'supabase_auth';
          console.log('[AUTH] Supabase Auth accepted credentials');
        }
      } catch (e) {
        console.warn('[AUTH] Supabase Auth fallback error:', (e as Error).message);
      }
    }

    if (!isValidPassword) {
      console.log('[AUTH] Invalid password');
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates: { failed_login_attempts: number; lock_until?: string } = {
        failed_login_attempts: failedAttempts
      };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.lock_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      }

      await supabase
        .from('users_unified')
        .update(updates)
        .eq('id', user.id);

      return { error: 'Credenciais inválidas' };
    }

    console.log('[AUTH] Login successful!');

    // Reset attempts and migrate legacy password if needed
    const nowIso = new Date().toISOString();
    const updateData: any = {
      failed_login_attempts: 0,
      lock_until: null,
      last_login: nowIso,
    };

    // If matched plaintext or used legacy 'password' column, upgrade to bcrypt hash
    if (matchedLegacyPlaintext || matchSource === 'password') {
      try {
        updateData.password_hash = await bcrypt.hash(password, 10);
        if ('password' in (user as any)) {
          updateData.password = null;
        }
        updateData.password_last_changed = nowIso;
        console.log('[AUTH] Upgraded legacy password to bcrypt hash');
      } catch (e) {
        console.warn('[AUTH] Failed to upgrade legacy password:', (e as Error).message);
      }
    }

    await supabase
      .from('users_unified')
      .update(updateData)
      .eq('id', user.id);

    // Check if user has access to Timesheet system
    const allowedRoles = ['ADMIN', 'MANAGER_TIMESHEET', 'USER', 'MANAGER'];
    if (!allowedRoles.includes(user.role)) {
      return { error: 'Você não tem permissão para acessar este sistema' };
    }

    // Generate a simple token (in production, use JWT)
    const token = toBase64(`${user.id}:${Date.now()}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name || `${user.first_name} ${user.last_name}`,
        role: user.role,
        tenant_id: (user as { tenant_id?: string }).tenant_id,
        phone_number: user.phone_number,
        position: user.position,
        department: user.department,
        active: user.active,
        avatar: user.avatar,
        drive_photo_url: user.drive_photo_url,
      },
      token,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return { error: 'Erro ao fazer login' };
  }
}

/**
 * Get user from session token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    // Decode token to get user ID
    const decoded = fromBase64(token);
    const [userId] = decoded.split(':');

    // Query the users_unified table
    const { data: user, error } = await supabase
      .from('users_unified')
      .select('*')
      .eq('id', userId)
      .eq('active', true)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      name: user.name || `${user.first_name} ${user.last_name}`,
      role: user.role,
      tenant_id: (user as { tenant_id?: string }).tenant_id,
      phone_number: user.phone_number,
      position: user.position,
      department: user.department,
      active: user.active,
      avatar: user.avatar,
      drive_photo_url: user.drive_photo_url,
    };
  } catch (error) {
    console.error('Get user from token error:', error);
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  // Clear session cookie (handled by the component)
}

