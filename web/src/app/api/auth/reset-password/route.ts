import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/**
 * Reset password with token
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find valid token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .limit(1)
      .maybeSingle();

    if (tokenError || !resetToken) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
    }

    // Check if token was already used
    if (resetToken.used_at) {
      return NextResponse.json({ error: 'Token já foi utilizado' }, { status: 400 });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(password, 10);

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
      .eq('id', resetToken.user_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 });
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id);

    console.log(`✅ Password reset successful for user ${resetToken.user_id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}

