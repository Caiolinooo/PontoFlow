import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import bcrypt from 'bcryptjs';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [GET /api/admin/users/[id]] Request received');
  
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  console.log('✅ [Auth] User authenticated:', user?.email, 'Role:', user?.role);

  if (!user) {
    console.log('❌ [Auth] Authentication failed: Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view users
  if (user.role !== 'ADMIN') {
    console.log('❌ [Auth] Authorization failed: User is not ADMIN, role:', user.role);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  console.log('👤 [Target] User ID to retrieve:', id);

  // Check if user has tenant_id
  if (!user.tenant_id) {
    console.log('❌ [Tenant] No tenant assigned to user');
    return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
  }

  try {
    const supabase = await getServerSupabase();
    const supabaseAdmin = getServiceSupabase();

    // First verify that the target user belongs to the same tenant
    console.log('🏢 [Tenant] Verifying target user belongs to tenant:', user.tenant_id);
    const { data: targetUserTenantRole, error: tenantCheckError } = await supabaseAdmin
      .from('tenant_user_roles')
      .select('tenant_id, role, user_id')
      .eq('user_id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (tenantCheckError) {
      console.error('❌ [Database] Error checking target user tenant:', tenantCheckError);
      return NextResponse.json({ 
        error: 'Database error when verifying user tenant',
        details: tenantCheckError.message 
      }, { status: 500 });
    }

    if (!targetUserTenantRole) {
      console.log('❌ [Tenant] Target user does not belong to the same tenant');
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    console.log('✅ [Tenant] Target user verified in same tenant');

    // Now get the full user data
    const { data: targetUser, error: userError } = await supabase
      .from('users_unified')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        name, 
        role, 
        active, 
        created_at, 
        updated_at,
        phone_number,
        position,
        department,
        email_verified,
        failed_login_attempts,
        lock_until
      `)
      .eq('id', id)
      .single();

    if (userError || !targetUser) {
      console.log('❌ [Database] User not found:', id, 'Error:', userError?.message);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('✅ [Database] User found:', targetUser.email);

    // Get additional tenant information
    const { data: tenantInfo } = await supabase
      .from('tenant_user_roles')
      .select('role, created_at')
      .eq('user_id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    // Return user data with additional context
    const userData = {
      ...targetUser,
      full_name: targetUser.name || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim(),
      tenant_role: tenantInfo?.role || 'USER',
      tenant_joined_at: tenantInfo?.created_at,
      is_locked: !!targetUser.lock_until && new Date(targetUser.lock_until) > new Date(),
      last_login: null, // Could be enhanced with actual last login data
    };

    // Don't expose sensitive fields
    delete (userData as any).password_hash;
    delete (userData as any).password_last_changed;

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('❌ [Server] Unexpected error in GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [PUT /api/admin/users/[id]] Request received');
  
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  console.log('✅ [Auth] User authenticated:', user?.email, 'Role:', user?.role);

  if (!user) {
    console.log('❌ [Auth] Authentication failed: Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update users
  if (user.role !== 'ADMIN') {
    console.log('❌ [Auth] Authorization failed: User is not ADMIN, role:', user.role);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const requestData = await request.json();
    
    console.log('📨 [Request] Update request for user:', id);
    console.log('🔍 [Request] Update fields:', Object.keys(requestData));

    const {
      email,
      password,
      first_name,
      last_name,
      phone_number,
      position,
      department,
      role,
      active,
    } = requestData;

    // Validate required fields
    console.log('🔍 [Validation] Checking required fields...');
    if (!email || !first_name || !last_name) {
      console.log('❌ [Validation] Missing required fields');
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Check if user has tenant_id
    if (!user.tenant_id) {
      console.log('❌ [Tenant] No tenant assigned to user');
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const supabaseAdmin = getServiceSupabase();

    // Verify target user belongs to the same tenant
    console.log('🏢 [Tenant] Verifying target user belongs to tenant:', user.tenant_id);
    const { data: targetUserTenantRole, error: tenantCheckError } = await supabaseAdmin
      .from('tenant_user_roles')
      .select('tenant_id, role, user_id')
      .eq('user_id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (tenantCheckError) {
      console.error('❌ [Database] Error checking target user tenant:', tenantCheckError);
      return NextResponse.json({ 
        error: 'Database error when verifying user tenant',
        details: tenantCheckError.message 
      }, { status: 500 });
    }

    if (!targetUserTenantRole) {
      console.log('❌ [Tenant] Target user does not belong to the same tenant');
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    console.log('✅ [Tenant] Target user verified in same tenant');

    // Check if email is already used by another user
    console.log('🔍 [Database] Checking for email conflict...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users_unified')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .neq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [Database] Error checking email conflict:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar e-mail' },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log('❌ [Validation] Email already in use by another user');
      return NextResponse.json(
        { error: 'Este e-mail já está em uso por outro usuário' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      email: email.toLowerCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      name: `${first_name.trim()} ${last_name.trim()}`,
      phone_number: phone_number?.trim() || null,
      position: position?.trim() || null,
      department: department?.trim() || null,
      role: role || 'USER',
      active: active !== undefined ? active : true,
      updated_at: new Date().toISOString(),
    };

    // Owner protection: cannot demote the owner admin
    const OWNER_EMAIL = process.env.OWNER_EMAIL;
    const OWNER_USER_ID = process.env.OWNER_USER_ID;

    console.log('👑 [Owner] Checking owner protection...');
    // Fetch current target user to compare (email)
    const { data: currentTarget } = await supabase
      .from('users_unified')
      .select('id, email, role')
      .eq('id', id)
      .single();

    const isOwnerTarget = !!(
      (OWNER_USER_ID && currentTarget?.id === OWNER_USER_ID) ||
      (OWNER_EMAIL && currentTarget?.email && currentTarget.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    );

    if (isOwnerTarget) {
      console.log('🛡️ [Owner] Target is owner, enforcing protection');
      // Enforce ADMIN role permanently
      if (role && role !== 'ADMIN') {
        console.log('❌ [Owner] Cannot demote owner admin');
        return NextResponse.json({ error: 'cannot_demote_owner' }, { status: 400 });
      }
      updateData.role = 'ADMIN';
      updateData.active = true; // optional: ensure owner stays active
    }

    // If password is provided, hash it
    if (password && password.trim() !== '') {
      console.log('🔐 [Security] Updating password...');
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.password_last_changed = new Date().toISOString();
      updateData.failed_login_attempts = 0;
      updateData.lock_until = null;
    }

    // Update user
    console.log('💾 [Database] Updating user in database...');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users_unified')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [Database] Update user error:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    console.log('✅ [Database] User updated successfully');

    return NextResponse.json({ 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active,
        updated_at: updatedUser.updated_at,
      }
    });
  } catch (error) {
    console.error('❌ [Server] Unexpected error in PUT /api/admin/users/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [DELETE /api/admin/users/[id]] Request received');
  
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  console.log('✅ [Auth] User authenticated:', user?.email, 'Role:', user?.role);

  if (!user) {
    console.log('❌ [Auth] Authentication failed: Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete users
  if (user.role !== 'ADMIN') {
    console.log('❌ [Auth] Authorization failed: User is not ADMIN, role:', user.role);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    console.log('🗑️ [Target] User ID to delete:', id);
    const supabase = await getServerSupabase();
    const supabaseAdmin = getServiceSupabase();

    // Check if user has tenant_id
    if (!user.tenant_id) {
      console.log('❌ [Tenant] No tenant assigned to user');
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    // Prevent self-deletion
    if (id === user.id) {
      console.log('❌ [Security] User cannot delete their own account');
      return NextResponse.json(
        { error: 'Você não pode deletar sua própria conta' },
        { status: 400 }
      );
    }

    // Verify target user belongs to the same tenant
    console.log('🏢 [Tenant] Verifying target user belongs to tenant:', user.tenant_id);
    const { data: targetUserTenantRole, error: tenantCheckError } = await supabaseAdmin
      .from('tenant_user_roles')
      .select('tenant_id, role, user_id')
      .eq('user_id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (tenantCheckError) {
      console.error('❌ [Database] Error checking target user tenant:', tenantCheckError);
      return NextResponse.json({ 
        error: 'Database error when verifying user tenant',
        details: tenantCheckError.message 
      }, { status: 500 });
    }

    if (!targetUserTenantRole) {
      console.log('❌ [Tenant] Target user does not belong to the same tenant');
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    console.log('✅ [Tenant] Target user verified in same tenant');

    // Owner protection: cannot delete/deactivate the owner admin
    const OWNER_EMAIL = process.env.OWNER_EMAIL;
    const OWNER_USER_ID = process.env.OWNER_USER_ID;
    
    const { data: target } = await supabase
      .from('users_unified')
      .select('id, email')
      .eq('id', id)
      .single();
    
    const isOwnerTarget = !!(
      (OWNER_USER_ID && target?.id === OWNER_USER_ID) ||
      (OWNER_EMAIL && target?.email && target.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    );
    
    if (isOwnerTarget) {
      console.log('🛡️ [Owner] Cannot delete owner admin');
      return NextResponse.json({ error: 'cannot_delete_owner' }, { status: 400 });
    }

    // Soft delete - just deactivate the user
    console.log('💾 [Database] Deactivating user (soft delete)...');
    const { error: deleteError } = await supabase
      .from('users_unified')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [Database] Delete user error:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar usuário' },
        { status: 500 }
      );
    }

    console.log('✅ [Database] User deactivated successfully');
    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('❌ [Server] Unexpected error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}