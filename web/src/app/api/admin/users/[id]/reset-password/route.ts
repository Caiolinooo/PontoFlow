import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import bcrypt from 'bcryptjs';
import { getServerSupabase } from '@/lib/supabase/server';

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
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can reset passwords
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    const supabase = await getServerSupabase();
    // Update user password
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
      console.error('Reset password error:', updateError);
      return NextResponse.json(
        { error: 'Erro ao resetar senha' },
        { status: 500 }
      );
    }

    // TODO: Send email with temporary password

    return NextResponse.json({ 
      success: true,
      temporaryPassword 
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

