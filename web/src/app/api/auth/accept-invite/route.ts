import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Validate token and get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }

    // Get invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado ou cancelado' },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      );
    }

    // Return invitation details (without sensitive data)
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        phone_number: invitation.phone_number,
        position: invitation.position,
        department: invitation.department,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error: any) {
    console.error('GET accept-invite error:', error);
    return NextResponse.json(
      { error: 'Erro ao validar convite' },
      { status: 500 }
    );
  }
}

// POST - Accept invitation and create user
export async function POST(request: NextRequest) {
  try {
    const {
      token,
      password,
      phone_number,
      position,
      department,
    } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    // Validate invitation status
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado ou cancelado' },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', invitation.email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users_unified')
      .insert({
        email: invitation.email.toLowerCase(),
        password_hash,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        name: `${invitation.first_name} ${invitation.last_name}`,
        phone_number: phone_number || invitation.phone_number || null,
        position: position || invitation.position || null,
        department: department || invitation.department || null,
        role: invitation.role,
        active: true,
        email_verified: true, // Auto-verify invited users
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Create or update profile (handle orphaned profiles from trigger)
    try {
      // Check if profile already exists (orphaned profile from trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', invitation.email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // If profile exists with different user_id, it's an orphaned profile
        // We need to delete it and create a new one with the correct user_id
        if (existingProfile.user_id !== newUser.id) {
          console.log('⚠️ [Profile] Found orphaned profile with user_id:', existingProfile.user_id);
          console.log('   Deleting orphaned profile and creating new one with user_id:', newUser.id);
          
          // Delete the orphaned profile
          await supabase
            .from('profiles')
            .delete()
            .eq('user_id', existingProfile.user_id);
        }
        
        // Create or update profile with correct user_id
        await supabase
          .from('profiles')
          .upsert({
            user_id: newUser.id,
            display_name: `${invitation.first_name} ${invitation.last_name}`,
            email: invitation.email.toLowerCase(),
            phone: phone_number || invitation.phone_number || null,
            ativo: true,
            locale: 'pt-BR',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });
      } else {
        // No profile exists, create new one
        await supabase.from('profiles').insert({
          user_id: newUser.id,
          display_name: `${invitation.first_name} ${invitation.last_name}`,
          email: invitation.email.toLowerCase(),
          phone: phone_number || invitation.phone_number || null,
          ativo: true,
          locale: 'pt-BR',
        });
      }
    } catch (profileError) {
      console.error('Error creating/updating profile:', profileError);
      // Continue even if profile creation/update fails
    }

    // Assign to tenants if specified
    if (invitation.tenant_ids && invitation.tenant_ids.length > 0) {
      try {
        const tenantRoles = invitation.tenant_ids.map((tenantId: string) => ({
          tenant_id: tenantId,
          user_id: newUser.id,
          role: invitation.role === 'ADMIN' ? 'ADMIN_GLOBAL' : 
                invitation.role === 'MANAGER' ? 'GERENTE' : 'COLAB',
        }));

        await supabase.from('tenant_user_roles').insert(tenantRoles);
      } catch (tenantError) {
        console.error('Error assigning tenants:', tenantError);
        // Continue even if tenant assignment fails
      }
    }

    // Assign to groups if specified (user becomes member of these groups)
    if (invitation.group_ids && invitation.group_ids.length > 0) {
      try {
        // First, get tenant_id for each group to populate the tenant_id field
        const { data: groupsData } = await supabase
          .from('groups')
          .select('id, tenant_id')
          .in('id', invitation.group_ids);

        if (groupsData && groupsData.length > 0) {
          // Create employee record first if needed
          const { data: employee } = await supabase
            .from('employees')
            .select('id, tenant_id')
            .eq('profile_id', newUser.id)
            .maybeSingle();

          let employeeId = employee?.id;

          // If no employee exists, create one for the first tenant
          if (!employee && invitation.tenant_ids && invitation.tenant_ids.length > 0) {
            const { data: newEmployee } = await supabase
              .from('employees')
              .insert({
                tenant_id: invitation.tenant_ids[0],
                profile_id: newUser.id,
                cargo: position || invitation.position || null,
                centro_custo: department || invitation.department || null,
              })
              .select()
              .single();

            employeeId = newEmployee?.id;
          }

          // Add user as member to all selected groups
          if (employeeId) {
            const groupMembers = groupsData.map((group) => ({
              employee_id: employeeId,
              group_id: group.id,
              tenant_id: group.tenant_id, // Required by phase-22 migration
            }));

            const { error: memberError } = await supabase
              .from('employee_group_members')
              .insert(groupMembers);

            if (memberError) {
              console.error('Error inserting group members:', memberError);
            }
          }
        }
      } catch (groupError) {
        console.error('Error assigning groups:', groupError);
        // Continue even if group assignment fails
      }
    }

    // Assign managed groups if specified (for MANAGER and MANAGER_TIMESHEET roles)
    if (invitation.managed_group_ids && invitation.managed_group_ids.length > 0) {
      // Validate that user has manager role
      if (invitation.role === 'MANAGER' || invitation.role === 'MANAGER_TIMESHEET') {
        try {
          // Get tenant_id for each group to populate the tenant_id field
          const { data: groupsData } = await supabase
            .from('groups')
            .select('id, tenant_id')
            .in('id', invitation.managed_group_ids);

          if (groupsData && groupsData.length > 0) {
            const managerAssignments = groupsData.map((group) => ({
              manager_id: newUser.id,
              group_id: group.id,
              tenant_id: group.tenant_id, // Required by phase-22 migration
            }));

            const { error: managerError } = await supabase
              .from('manager_group_assignments')
              .insert(managerAssignments);

            if (managerError) {
              console.error('Error inserting manager assignments:', managerError);
            }
          }
        } catch (managerError) {
          console.error('Error assigning managed groups:', managerError);
          // Continue even if manager assignment fails
        }
      } else {
        console.warn('Attempted to assign managed groups to non-manager role:', invitation.role);
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('POST accept-invite error:', error);
    return NextResponse.json(
      { error: 'Erro ao aceitar convite' },
      { status: 500 }
    );
  }
}

