import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import bcrypt from 'bcryptjs';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can list users
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Math.max(1, Math.min(isNaN(limitRaw) ? 50 : limitRaw, 100));

  const supabase = await getServerSupabase();
  let query = supabase
    .from('users_unified')
    .select('id, email, first_name, last_name, name, role, active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (q) {
    query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,name.ilike.%${q}%`);
  }
  const { data: users, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create users
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
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
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user in users_unified
    const { data: newUser, error: createError } = await supabase
      .from('users_unified')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        name: `${first_name} ${last_name}`,
        phone_number: phone_number || null,
        position: position || null,
        department: department || null,
        role: role || 'USER',
        active: active !== undefined ? active : true,
        email_verified: false,
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Create user error:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

