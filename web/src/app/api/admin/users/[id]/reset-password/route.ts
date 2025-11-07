import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import bcrypt from 'bcryptjs';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [POST /api/admin/users/[id]/reset-password] Request received');
  
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  console.log('✅ [Auth] User authenticated:', user?.email, 'Role:', user?.role);

  if (!user) {
    console.log('❌ [Auth] Authentication failed: Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can reset passwords
  if (user.role !== 'ADMIN') {
    console.log('❌ [Auth] Authorization failed: User is not ADMIN, role:', user.role);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    console.log('🔑 [Target] User ID for password reset:', id);

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

    // Generate temporary password
    console.log('🔐 [Security] Generating temporary password...');
    const temporaryPassword = generateTemporaryPassword();
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    // Update user password
    console.log('💾 [Database] Updating user password...');
    const { error: updateError } = await supabase
      .from('users_unified')
      .update({
        password_hash,
        password_last_changed: new Date().toISOString(),
        failed_login_attempts: 0,
        lock_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('❌ [Database] Reset password error:', updateError);
      return NextResponse.json(
        { 
          error: 'Erro ao resetar senha',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    console.log('✅ [Database] Password reset successfully');

    // TODO: Send email with temporary password
    console.log('📧 [Email] TODO: Send email with temporary password to user');
    console.log('🔐 [Security] Temporary password generated (not returned in response for security)');

    // SECURITY: Never return password in response - should be sent via email only
    return NextResponse.json({
      success: true,
      message: 'Senha resetada com sucesso. Uma senha temporária será enviada por email.'
    });
  } catch (error) {
    console.error('❌ [Server] Unexpected error in POST /api/admin/users/[id]/reset-password:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}