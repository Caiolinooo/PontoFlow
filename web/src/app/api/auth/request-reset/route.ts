import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/notifications/email-service';
import { passwordResetEmail } from '@/lib/notifications/templates/password-reset';
import { branding } from '@/config/branding';
import { getBaseUrlSync } from '@/lib/base-url';

/**
 * Request a password reset link
 * This endpoint always returns 200 to avoid leaking user existence.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, locale = 'pt-BR' } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Best-effort: check if user exists and send reset email (no-op on errors)
    // Always return success to avoid leaking user existence
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users_unified')
        .select('id, first_name, last_name, email')
        .eq('email', normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (!userError && user) {
        // Generate secure random token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store token in database
        const { error: tokenError } = await supabase
          .from('password_reset_tokens')
          .insert({
            user_id: user.id,
            token,
            expires_at: expiresAt.toISOString(),
          });

        if (!tokenError) {
          // Build reset URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || getBaseUrlSync();
          const resetUrl = `${baseUrl}/${locale}/auth/reset-password?token=${token}`;

          // Send email
          const userName = `${user.first_name} ${user.last_name}`;
          const { subject, html } = passwordResetEmail({
            name: userName,
            resetUrl,
            locale: locale as 'pt-BR' | 'en-GB',
            branding: {
              companyName: branding.companyName,
              logoUrl: branding.logoUrl,
            },
          });

          await sendEmail({
            to: user.email,
            subject,
            html,
          });

          console.log(`✅ Password reset email sent to ${user.email}`);
        }
      }
    } catch (error) {
      // Log error but don't reveal it to the user
      console.error('Password reset error:', error);
    }

    // Always return success to avoid leaking user existence
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ ok: true });
  }
}