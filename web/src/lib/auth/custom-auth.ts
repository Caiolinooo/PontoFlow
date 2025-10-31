import { createClient } from '@supabase/supabase-js';

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

// Lazy initialization to avoid build-time errors
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

// Client for regular operations (anon key)
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Admin client for auth operations (service role key)
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }

    if (!serviceKey) {
      console.error('[AUTH] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!');
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    _supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

// Interface for users_unified table
interface UnifiedUser {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
  active: boolean;
  tenant_id?: string;
  phone_number?: string;
  position?: string;
  department?: string;
  drive_photo_url?: string;
  [key: string]: unknown;
}

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
 * Authenticate user using Supabase Auth or users_unified table
 */
export async function signInWithCredentials(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    console.log('[AUTH] Attempting login for:', normalizedEmail);

    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    // Try Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (authError || !authData.user) {
      console.log('[AUTH] Supabase Auth failed:', authError?.message);
      console.log('[AUTH] Trying users_unified table fallback...');

      // Fallback: Try users_unified table
      const { data: unifiedUserData, error: unifiedError } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('active', true)
        .single();

      if (unifiedError || !unifiedUserData) {
        console.log('[AUTH] users_unified lookup failed:', unifiedError?.message);
        return { error: 'Credenciais inválidas' };
      }

      const unifiedUser = unifiedUserData as UnifiedUser;

      // Verify password using bcrypt
      const bcrypt = await import('bcryptjs');
      const passwordMatch = await bcrypt.compare(password, unifiedUser.password_hash);

      if (!passwordMatch) {
        console.log('[AUTH] Password mismatch for users_unified user');
        return { error: 'Credenciais inválidas' };
      }

      console.log('[AUTH] users_unified authentication successful for:', unifiedUser.email);

      // Get additional data for unified user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let profile: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenantRole: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let employee: any = null;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', unifiedUser.id)
          .single();
        profile = profileData;
      } catch (err) {
        console.log('[AUTH] No profile found for unified user');
      }

      try {
        const { data: roleData } = await supabaseAdmin
          .from('tenant_user_roles')
          .select('*')
          .eq('user_id', unifiedUser.id)
          .limit(1)
          .maybeSingle();
        tenantRole = roleData;
      } catch (err) {
        console.log('[AUTH] No tenant role found for unified user');
      }

      try {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', unifiedUser.id)
          .single();
        employee = employeeData;
      } catch (err) {
        console.log('[AUTH] No employee record found for unified user');
      }

      const userRole = unifiedUser.role || tenantRole?.role || 'USER';
      const isActive = unifiedUser.active !== false && employee?.ativo !== false;

      console.log('[AUTH] Unified user found:', unifiedUser.email, 'Role:', userRole, 'Active:', isActive);

      if (!isActive) {
        console.log('[AUTH] Unified user account is inactive');
        return { error: 'Conta inativa. Entre em contato com o administrador.' };
      }

      // Generate token
      const token = toBase64(`${unifiedUser.id}:${Date.now()}`);

      return {
        user: {
          id: unifiedUser.id,
          email: unifiedUser.email,
          first_name: unifiedUser.first_name || profile?.first_name || '',
          last_name: unifiedUser.last_name || profile?.last_name || '',
          name: unifiedUser.name || profile?.display_name || `${unifiedUser.first_name || ''} ${unifiedUser.last_name || ''}`.trim() || unifiedUser.email.split('@')[0],
          role: userRole as 'ADMIN' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'USER',
          tenant_id: unifiedUser.tenant_id || tenantRole?.tenant_id || profile?.tenant_id,
          phone_number: unifiedUser.phone_number || profile?.phone_number || '',
          position: unifiedUser.position || employee?.cargo || '',
          department: unifiedUser.department || employee?.departamento || employee?.centro_custo || '',
          active: isActive,
          avatar: profile?.avatar_url,
          drive_photo_url: unifiedUser.drive_photo_url,
        },
        token,
      };
    }

    console.log('[AUTH] Supabase Auth successful for:', authData.user.email);

    // Simplified auth - create user with basic data from auth metadata
    // In a real implementation, you'd fetch from profiles/employees tables
    const userMeta = authData.user.user_metadata || {};
    const authEmail = authData.user.email || '';
    
    console.log('[AUTH] User metadata:', userMeta);

    // Default user data
    const userData = {
      id: authData.user.id,
      email: authEmail,
      raw_user_meta_data: userMeta
    };

    // Get profile data separately (if exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tenantRole: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let employee: any = null;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      profile = profileData;
    } catch (err) {
      console.log('[AUTH] No profile found for user');
    }

    try {
      // Use admin client to bypass RLS
      const { data: roleData } = await supabaseAdmin
        .from('tenant_user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .limit(1)
        .maybeSingle();
      tenantRole = roleData;
    } catch (err) {
      console.log('[AUTH] No tenant role found for user');
    }

    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      employee = employeeData;
    } catch (err) {
      console.log('[AUTH] No employee record found for user');
    }

    const userRole = tenantRole?.role || userMeta.role || 'USER';
    const isActive = employee?.ativo !== false;

    console.log('[AUTH] User found:', authEmail, 'Role:', userRole, 'Active:', isActive);

    // For now, allow all authenticated users to access the system
    // In production, you might want to enforce role restrictions
    if (!isActive) {
      console.log('[AUTH] Employee account is inactive');
      return { error: 'Conta inativa. Entre em contato com o administrador.' };
    }

    console.log('[AUTH] Login successful!');

    // Generate a simple token (in production, use JWT)
    const token = toBase64(`${userData.id}:${Date.now()}`);

    return {
      user: {
        id: userData.id,
        email: authEmail,
        first_name: profile?.first_name || userMeta.first_name || '',
        last_name: profile?.last_name || userMeta.last_name || '',
        name: profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || authEmail.split('@')[0],
        role: userRole as 'ADMIN' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'USER',
        tenant_id: tenantRole?.tenant_id || profile?.tenant_id,
        phone_number: profile?.phone_number || '',
        position: employee?.cargo || '',
        department: employee?.departamento || employee?.centro_custo || '',
        active: isActive,
        avatar: profile?.avatar_url,
        drive_photo_url: userMeta.drive_photo_url,
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
    // Decode token to get user ID and timestamp
    let decoded: string;
    try {
      decoded = fromBase64(token);
    } catch (error) {
      console.log('getUserFromToken: Malformed base64 token');
      return null;
    }
    
    const parts = decoded.split(':');
    if (parts.length !== 2) {
      console.log('getUserFromToken: Invalid token format');
      return null;
    }
    
    const [userId, timestamp] = parts;
    const timestampNum = parseInt(timestamp);

    if (!userId || !timestamp || isNaN(timestampNum)) {
      console.log('getUserFromToken: Invalid token format');
      return null;
    }

    // Check if token is too old (7 days)
    const tokenAge = Date.now() - timestampNum;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    if (tokenAge > maxAge) {
      console.log('getUserFromToken: Token expired');
      return null;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('getUserFromToken: Invalid user ID format:', userId);
      return null;
    }

    console.log('[getUserFromToken] Looking up user ID:', userId);

    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    // Try Supabase Auth first
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authUser?.user) {
      console.log('[getUserFromToken] User not found in Supabase Auth. UserID:', userId, 'Error:', authError?.message);
      console.log('[getUserFromToken] Trying users_unified table fallback...');

      // Fallback: Try users_unified table
      const { data: unifiedUserData, error: unifiedError } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('id', userId)
        .eq('active', true)
        .single();

      if (unifiedError || !unifiedUserData) {
        console.error('[getUserFromToken] User not found in users_unified. UserID:', userId, 'Error:', unifiedError?.message);
        return null;
      }

      const unifiedUser = unifiedUserData as UnifiedUser;

      console.log('[getUserFromToken] User found in users_unified:', unifiedUser.email);

      // Get additional data for unified user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let profile: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenantRole: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let employee: any = null;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        profile = profileData;
      } catch (err) {
        console.log('[getUserFromToken] No profile found for unified user');
      }

      try {
        const { data: roleData } = await supabaseAdmin
          .from('tenant_user_roles')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        tenantRole = roleData;
      } catch (err) {
        console.log('[getUserFromToken] No tenant role found for unified user');
      }

      try {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', userId)
          .single();
        employee = employeeData;
      } catch (err) {
        console.log('[getUserFromToken] No employee record found for unified user');
      }

      const userRole = unifiedUser.role || tenantRole?.role || 'USER';
      const isActive = unifiedUser.active !== false && employee?.ativo !== false;

      console.log('[getUserFromToken] Unified user resolved. Role:', userRole, 'Active:', isActive);

      // Resolve tenant_id with priority: unifiedUser > tenantRole > profile
      const selectedTenant = unifiedUser.tenant_id || tenantRole?.tenant_id || profile?.tenant_id;

      console.log('[getUserFromToken] Resolved tenant_id:', selectedTenant, 'from sources:', {
        unifiedUser: unifiedUser.tenant_id,
        tenantRole: tenantRole?.tenant_id,
        profile: profile?.tenant_id
      });

      return {
        id: unifiedUser.id,
        email: unifiedUser.email,
        first_name: unifiedUser.first_name || profile?.first_name || '',
        last_name: unifiedUser.last_name || profile?.last_name || '',
        name: unifiedUser.name || profile?.display_name || `${unifiedUser.first_name || ''} ${unifiedUser.last_name || ''}`.trim() || unifiedUser.email.split('@')[0],
        role: userRole as 'ADMIN' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'USER',
        tenant_id: selectedTenant,
        phone_number: unifiedUser.phone_number || profile?.phone_number || '',
        position: unifiedUser.position || employee?.cargo || '',
        department: unifiedUser.department || employee?.departamento || employee?.centro_custo || '',
        active: isActive,
        avatar: profile?.avatar_url,
        drive_photo_url: unifiedUser.drive_photo_url,
      };
    }

    console.log('[getUserFromToken] User found in Supabase Auth:', authUser.user.email);
    console.log('[getUserFromToken] User metadata:', JSON.stringify(authUser.user.user_metadata, null, 2));

    // Primary source: Supabase Auth metadata
    const authMetadata = authUser.user.user_metadata || {};
    const authEmail = authUser.user.email || '';

    // Secondary source: Custom application tables (if they exist)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tenantRole: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let employee: any = null;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      profile = profileData;
    } catch (err) {
      // Profile not found - this is OK, we'll use auth metadata
      console.log('[getUserFromToken] No profile found, using auth metadata');
    }

    try {
      // Get ALL roles for this user (not just one) - use admin client to bypass RLS
      const { data: rolesData } = await supabaseAdmin
        .from('tenant_user_roles')
        .select('*')
        .eq('user_id', userId);

      if (rolesData && rolesData.length > 0) {
        tenantRole = rolesData[0]; // Use first role for compatibility with existing code
        console.log(`[getUserFromToken] Found ${rolesData.length} roles, using first:`, tenantRole);
      } else {
        console.log('[getUserFromToken] No tenant roles found in database');
      }
    } catch (err) {
      console.log('[getUserFromToken] Error fetching tenant roles:', err);
    }

    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();
      employee = employeeData;
    } catch (err) {
      // Employee record not found - this is OK
      console.log('[getUserFromToken] No employee record found');
    }

    // Build user data with fallback logic:
    // 1. Use Supabase Auth metadata (primary source for role)
    // 2. Fall back to custom table data
    // 3. Use reasonable defaults

    // IMPORTANT: Use authMetadata.role first because tenant_user_roles.role is for tenant-level permissions (TENANT_ADMIN)
    // while authMetadata.role is the global application role (ADMIN, MANAGER, USER, etc.)
    const userRole = authMetadata.role || tenantRole?.role || 'USER';
    const isActive = employee?.ativo !== false; // Default to active if no employee record
    
    const firstName = profile?.first_name || authMetadata.first_name || 'User';
    const lastName = profile?.last_name || authMetadata.last_name || '';
    const displayName = profile?.display_name || authMetadata.display_name || 
                       (firstName && lastName ? `${firstName} ${lastName}` : 
                        firstName || authEmail.split('@')[0] || 'User');

    // Always check tenant_user_roles to get the latest list of available tenants
    let userTenantRoles: Array<{ tenant_id: string; role: string }> = [];
    try {
      // Use admin client to bypass RLS
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('tenant_user_roles')
        .select('tenant_id, role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('[getUserFromToken] Error querying tenant_user_roles:', rolesError);
      } else if (roles && roles.length > 0) {
        userTenantRoles = roles;
        console.log('[getUserFromToken] Found tenant roles:', userTenantRoles.length);
      } else {
        console.log('[getUserFromToken] No tenant roles found in database');
      }
    } catch (err) {
      console.warn('[getUserFromToken] Error checking tenant_user_roles:', err);
    }

    // Get tenant_id with priority:
    // 1. selected_tenant_id from auth metadata (for admins who can switch tenants)
    // 2. tenant_id from auth metadata
    // 3. Employee record
    // 4. First tenant from tenant_user_roles
    // 5. Profile
    let tenantId = authMetadata.selected_tenant_id ||
                   authMetadata.tenant_id ||
                   employee?.tenant_id ||
                   (userTenantRoles.length > 0 ? userTenantRoles[0].tenant_id : null) ||
                   profile?.tenant_id;

    // Update user metadata with available tenants if we found any
    if (userTenantRoles.length > 0) {
      const availableTenants = userTenantRoles.map(r => ({ tenant_id: r.tenant_id, role: r.role }));

      // Only update if the list has changed
      const currentAvailableTenants = authMetadata.available_tenants || [];
      const hasChanged = JSON.stringify(currentAvailableTenants) !== JSON.stringify(availableTenants);

      if (hasChanged || !tenantId) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...authMetadata,
              selected_tenant_id: tenantId || userTenantRoles[0].tenant_id,
              available_tenants: availableTenants
            }
          });
          console.log('[getUserFromToken] Updated user metadata with available tenants');
        } catch (updateError) {
          console.warn('[getUserFromToken] Failed to update user metadata:', updateError);
        }
      }
    }

    console.log('[getUserFromToken] Resolved tenant_id:', tenantId, 'from sources:', {
      selectedTenant: authMetadata.selected_tenant_id,
      authMetadata: authMetadata.tenant_id,
      employee: employee?.tenant_id,
      tenantRole: tenantRole?.tenant_id,
      profile: profile?.tenant_id
    });

    return {
      id: userId,
      email: authEmail,
      first_name: firstName,
      last_name: lastName,
      name: displayName,
      role: userRole as 'ADMIN' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'USER',
      tenant_id: tenantId,
      phone_number: profile?.phone_number || authMetadata.phone_number || '',
      position: employee?.cargo || authMetadata.position || '',
      department: employee?.departamento || employee?.centro_custo || authMetadata.department || '',
      active: isActive,
      avatar: profile?.avatar_url || authMetadata.avatar_url,
      drive_photo_url: authMetadata.drive_photo_url,
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
