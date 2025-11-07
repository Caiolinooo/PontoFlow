import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/notifications/email-service';
import { getEmailContextByEmail } from '@/lib/notifications/email-context';
import crypto from 'crypto';
import { getBaseUrlSync } from '@/lib/base-url';

// GET - List all invitations
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/admin/invitations] Request received');

    const currentUser = await requireApiRole(['ADMIN']);
    console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);

    const supabase = await getServerSupabase();
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select('*, invited_by_user:users_unified!invited_by(first_name, last_name)', { count: 'exact' });

    if (error) {
      console.error('❌ [DB] Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    console.log('✅ [DB] Invitations fetched successfully:', invitations?.length);
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('❌ [Error] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new invitation
export async function POST(request: NextRequest) {
  try {
    console.log('📬 [POST /api/admin/invitations] Request received');

    const currentUser = await requireApiRole(['ADMIN']);
    console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);

    const body = await request.json();
    const { email, role = 'USER', tenant_id } = body;

    if (!email || !tenant_id) {
      return NextResponse.json(
        { error: 'Email and tenant_id are required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check for pending invitation
    const { data: pendingInvitation } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (pendingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        role,
        tenant_id,
        invited_by: currentUser.id,
        token,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('❌ [DB] Error creating invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send email invitation
    const userLocale = 'pt-BR';
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${userLocale}/auth/accept-invite?token=${token}`;
    
    const roleNames: Record<string, string> = {
      USER: 'Usuário',
      MANAGER_TIMESHEET: 'Gerente de Timesheet',
      MANAGER: 'Gerente',
      ADMIN: 'Administrador',
    };

    // Create simple invitation email content
    const invitationHtml = `
      <h2>Convite para Timesheet Manager</h2>
      <p>Você foi convidado para se juntar ao Timesheet Manager como <strong>${roleNames[role] || role}</strong>.</p>
      <p>Clique no link abaixo para aceitar o convite:</p>
      <p><a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aceitar Convite</a></p>
      <p>Este link expira em: ${expiresAt}</p>
      <p>Se você não solicitou este convite, ignore este email.</p>
    `;
    
    await sendEmail({
      to: email,
      subject: 'Convite para Timesheet Manager',
      html: invitationHtml,
      tenantId: tenant_id,
    });

    console.log('✅ [Invitation] Created and email sent successfully');
    return NextResponse.json({ 
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expires_at,
      }
    });

  } catch (error) {
    console.error('❌ [Error] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}