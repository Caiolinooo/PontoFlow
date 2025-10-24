import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import bcrypt from 'bcryptjs';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view users
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const supabase = await getServerSupabase();
  const { data: targetUser, error } = await supabase
    .from('users_unified')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ user: targetUser });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update users
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
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
    } = await request.json();

    // Validate required fields
    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    // Check if email is already used by another user
    const { data: existingUser } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso por outro usuário' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      email,
      first_name,
      last_name,
      name: `${first_name} ${last_name}`,
      phone_number: phone_number || null,
      position: position || null,
      department: department || null,
      role: role || 'USER',
      active: active !== undefined ? active : true,
      updated_at: new Date().toISOString(),
    };

    // Owner protection: cannot demote the owner admin
    const OWNER_EMAIL = process.env.OWNER_EMAIL;
    const OWNER_USER_ID = process.env.OWNER_USER_ID;

    // Fetch current target user to compare (email)
    const { data: currentTarget } = await supabase
      .from('users_unified')
      .select('id,email,role')
      .eq('id', id)
      .single();

    const isOwnerTarget = !!(
      (OWNER_USER_ID && currentTarget?.id === OWNER_USER_ID) ||
      (OWNER_EMAIL && currentTarget?.email && currentTarget.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    );

    if (isOwnerTarget) {
      // Enforce ADMIN role permanently
      if (role && role !== 'ADMIN') {
        return NextResponse.json({ error: 'cannot_demote_owner' }, { status: 400 });
      }
      updateData.role = 'ADMIN';
      updateData.active = true; // optional: ensure owner stays active
    }

    // If password is provided, hash it
    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.password_last_changed = new Date().toISOString();
      updateData.failed_login_attempts = 0;
      updateData.lock_until = null;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users_unified')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete users
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const supabase = await getServerSupabase();

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Você não pode deletar sua própria conta' },
        { status: 400 }
      );
    }

    // Owner protection: cannot delete/deactivate the owner admin
    const OWNER_EMAIL = process.env.OWNER_EMAIL;
    const OWNER_USER_ID = process.env.OWNER_USER_ID;
    const { data: target } = await supabase
      .from('users_unified')
      .select('id,email')
      .eq('id', id)
      .single();
    const isOwnerTarget = !!(
      (OWNER_USER_ID && target?.id === OWNER_USER_ID) ||
      (OWNER_EMAIL && target?.email && target.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    );
    if (isOwnerTarget) {
      return NextResponse.json({ error: 'cannot_delete_owner' }, { status: 400 });
    }

    // Soft delete - just deactivate the user
    const { error: deleteError } = await supabase
      .from('users_unified')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

