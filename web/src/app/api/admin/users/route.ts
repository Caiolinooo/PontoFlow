import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { requireApiRole } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [Request] Starting GET /api/admin/users');
    
    // Get locale from request headers or default to 'en-GB'
    const locale = request.headers.get('x-locale') || 'en-GB';
    
    // Verify admin access (using API-specific function that returns 403 instead of redirecting)
    const adminUser = await requireApiRole(['ADMIN']);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    
    console.log('🔍 [Query] Search params:', { q, limit, user: adminUser.email });
    
    const supabase = getServiceSupabase();
    
    // Get tenant users for admin
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', adminUser.tenant_id);

    if (tenantUsersError) {
      console.error('❌ [Database] Error fetching tenant users:', tenantUsersError);
      return NextResponse.json({ 
        error: 'Database error when fetching tenant users',
        details: tenantUsersError.message 
      }, { status: 500 });
    }

    console.log('📊 [Database] Found', tenantUsers?.length || 0, 'tenant users');

    const userIds = (tenantUsers ?? []).map((tu: any) => tu.user_id).filter(Boolean);

    if (userIds.length === 0) {
      console.log('ℹ️ [Database] No users found for tenant');
      return NextResponse.json({ users: [] });
    }

    console.log('🔍 [Database] User IDs to query:', userIds.length);

    // Query users_unified filtered by tenant access
    let query = supabase
      .from('users_unified')
      .select('id, email, first_name, last_name, name, role, active, created_at')
      .in('id', userIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      console.log('🔍 [Query] Applying search filter:', q);
      query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,name.ilike.%${q}%`);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('❌ [Database] Error fetching users:', usersError);
      return NextResponse.json({ 
        error: 'Database error when fetching users',
        details: usersError.message 
      }, { status: 500 });
    }

    console.log('✅ [Database] Successfully retrieved', users?.length || 0, 'users');

    // Add additional user data for better context
    const usersWithDetails = users?.map(user => ({
      ...user,
      full_name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      has_password: true, // Assume users have passwords for security
    })) || [];
    
    return NextResponse.json({ users: usersWithDetails });
  } catch (error) {
    console.error('❌ [Server] Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Request] Starting POST /api/admin/users');
    
    // Get locale from request headers or default to 'en-GB'
    const locale = request.headers.get('x-locale') || 'en-GB';
    
    // Verify admin access (using API-specific function that returns 403 instead of redirecting)
    const adminUser = await requireApiRole(['ADMIN']);
    
    const body = await request.json();
    const { email, first_name, last_name, role, password, name } = body;
    
    // Validation
    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email and role are required' 
      }, { status: 400 });
    }
    
    console.log('👤 [User] Creating new user:', { email, role, name: name || `${first_name} ${last_name}` });
    
    const supabase = getServiceSupabase();
    
    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: password || 'TempPass123!',
      email_confirm: true,
      user_metadata: {
        first_name: first_name || '',
        last_name: last_name || '',
        name: name || `${first_name || ''} ${last_name || ''}`.trim()
      }
    });
    
    if (authError) {
      console.error('❌ [Auth] Error creating user:', authError);
      return NextResponse.json({ 
        error: 'Failed to create user in auth system',
        details: authError.message 
      }, { status: 500 });
    }
    
    if (!authUser.user) {
      return NextResponse.json({ 
        error: 'User created but no user data returned' 
      }, { status: 500 });
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        first_name: first_name || '',
        last_name: last_name || '',
        name: name || `${first_name || ''} ${last_name || ''}`.trim(),
        role,
        tenant_id: adminUser.tenant_id,
        active: true
      });
      
    if (profileError) {
      console.error('❌ [Database] Error creating profile:', profileError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ 
        error: 'Failed to create user profile',
        details: profileError.message 
      }, { status: 500 });
    }
    
    // Add to tenant_users
    const { error: tenantError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: authUser.user.id,
        tenant_id: adminUser.tenant_id
      });
      
    if (tenantError) {
      console.error('❌ [Database] Error adding to tenant:', tenantError);
      return NextResponse.json({ 
        error: 'Failed to add user to tenant',
        details: tenantError.message 
      }, { status: 500 });
    }
    
    console.log('✅ [User] Successfully created user:', authUser.user.id);
    
    return NextResponse.json({ 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        first_name,
        last_name,
        name: name || `${first_name || ''} ${last_name || ''}`.trim(),
        role,
        active: true
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ [Server] Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}