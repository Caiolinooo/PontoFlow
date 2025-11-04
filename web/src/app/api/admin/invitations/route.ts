import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email-service';
import crypto from 'crypto';

// GET - List all invitations
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const supabase = await getServerSupabase();
    
    let query = supabase
      .from('user_invitations')
      .select('*, invited_by_user:users_unified!invited_by(id, email, first_name, last_name)', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: invitations, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar convites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitations,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error: any) {
    console.error('GET invitations error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar convites' },
      { status: error.status || 500 }
    );
  }
}

// POST - Create new invitation
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [POST /api/admin/invitations] Request received');

    let currentUser;
    try {
      currentUser = await requireApiRole(['ADMIN']);
      console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);
    } catch (authError: any) {
      console.error('❌ [Auth] Authentication failed:', authError.message);
      return NextResponse.json(
        { error: authError.message === 'Unauthorized' ? 'Não autenticado' : 'Sem permissão' },
        { status: authError.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    const body = await request.json();

    // Log complete request body for debugging
    console.log('📨 [POST /api/admin/invitations] Request body:', JSON.stringify(body, null, 2));

    const {
      email,
      first_name,
      last_name,
      phone_number,
      position,
      department,
      role,
      tenant_ids,
      group_ids,
      managed_group_ids,
    } = body;

    // Validate required fields
    console.log('🔍 [Validation] Checking required fields...');
    console.log('  - email:', email);
    console.log('  - first_name:', first_name);
    console.log('  - last_name:', last_name);
    console.log('  - role:', role);

    if (!email || !first_name || !last_name || !role) {
      console.error('❌ [Validation] Missing required fields');
      return NextResponse.json(
        { error: 'Campos obrigatórios: email, first_name, last_name, role' },
        { status: 400 }
      );
    }

    // Validate email format
    console.log('🔍 [Validation] Checking email format...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ [Validation] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validate managed_group_ids only for manager roles
    console.log('🔍 [Validation] Checking managed_group_ids...');
    console.log('  - role:', role);
    console.log('  - managed_group_ids:', managed_group_ids);

    if (managed_group_ids && managed_group_ids.length > 0) {
      if (role !== 'MANAGER' && role !== 'MANAGER_TIMESHEET') {
        console.error('❌ [Validation] Non-manager role with managed groups:', role);
        return NextResponse.json(
          { error: 'Apenas gerentes podem ter grupos gerenciados' },
          { status: 400 }
        );
      }
    }

    console.log('✅ [Validation] All validations passed');
    const supabase = await getServerSupabase();

    // Check if user already exists
    console.log('🔍 [Database] Checking for existing user with email:', email.toLowerCase());
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('❌ [Database] Error checking existing user:', userCheckError);
    }

    if (existingUser) {
      console.error('❌ [Validation] User already exists:', existingUser.id);
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      );
    }
    console.log('✅ [Database] No existing user found');

    // Check if there's already a pending invitation
    console.log('🔍 [Database] Checking for pending invitation...');
    const { data: existingInvitation, error: inviteCheckError } = await supabase
      .from('user_invitations')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteCheckError) {
      console.error('❌ [Database] Error checking pending invitation:', inviteCheckError);
    }

    if (existingInvitation) {
      console.error('❌ [Validation] Pending invitation already exists:', existingInvitation.id);
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este email' },
        { status: 400 }
      );
    }
    console.log('✅ [Database] No pending invitation found');

    // Generate unique token
    const token = crypto.randomUUID();
    console.log('🔑 [Token] Generated token:', token);

    // Prepare invitation data
    const invitationData = {
      email: email.toLowerCase(),
      first_name,
      last_name,
      phone_number: phone_number || null,
      position: position || null,
      department: department || null,
      role,
      token,
      invited_by: currentUser.id,
      tenant_ids: tenant_ids || [],
      group_ids: group_ids || [],
      managed_group_ids: managed_group_ids || [],
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    console.log('💾 [Database] Creating invitation with data:', JSON.stringify(invitationData, null, 2));

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('user_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (createError) {
      console.error('❌ [Database] Error creating invitation:', createError);
      console.error('❌ [Database] Error details:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        { error: 'Erro ao criar convite', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Database] Invitation created successfully:', invitation.id);

    // Send invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${token}`;
      
      await sendEmail({
        to: email,
        subject: '🎉 Você foi convidado para o PontoFlow',
        html: generateInvitationEmail({
          firstName: first_name,
          lastName: last_name,
          invitedBy: `${currentUser.first_name} ${currentUser.last_name}`,
          role,
          inviteUrl,
          expiresAt: invitation.expires_at,
        }),
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error: any) {
    console.error('❌ [POST /api/admin/invitations] Unhandled error:', error);
    console.error('❌ [Error] Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar convite', details: error.toString() },
      { status: error.status || 500 }
    );
  }
}

// Helper function to generate invitation email HTML
function generateInvitationEmail({
  firstName,
  lastName,
  invitedBy,
  role,
  inviteUrl,
  expiresAt,
}: {
  firstName: string;
  lastName: string;
  invitedBy: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}) {
  const roleNames: Record<string, string> = {
    USER: 'Usuário',
    MANAGER_TIMESHEET: 'Gerente de Timesheet',
    MANAGER: 'Gerente',
    ADMIN: 'Administrador',
  };

  const expiresDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Convite PontoFlow</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🎉 Você foi convidado!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    Olá <strong>${firstName} ${lastName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    <strong>${invitedBy}</strong> convidou você para fazer parte do <strong>PontoFlow</strong>, 
                    o sistema de gerenciamento de timesheets da ABZ Group.
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      <strong>Sua função:</strong> ${roleNames[role] || role}
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                    Para aceitar o convite e completar seu cadastro, clique no botão abaixo:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          Aceitar Convite
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                  </p>
                  
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; font-size: 13px; color: #999999;">
                      ⏰ Este convite expira em <strong>${expiresDate}</strong>
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #999999;">
                    © ${new Date().getFullYear()} ABZ Group - PontoFlow. Todos os direitos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

