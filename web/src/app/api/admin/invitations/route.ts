import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/notifications/email-service';
import { getEmailContextByEmail } from '@/lib/notifications/email-context';
import crypto from 'crypto';

// GET - List all invitations
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/admin/invitations] Request received');

    const currentUser = await requireApiRole(['ADMIN']);
    console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    console.log('📊 [Query] Filters:', { status, page, pageSize });

    // Use service role to bypass RLS for debugging
    const supabase = getServiceSupabase();
    console.log('🔑 [Database] Using service role client');

    // Fetch invitations without join first (to avoid PostgREST foreign key issues)
    let query = supabase
      .from('user_invitations')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    console.log('🔍 [Database] Executing query...');
    const { data: invitations, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('❌ [Database] Error fetching invitations:', error);
      console.error('❌ [Database] Error code:', error.code);
      console.error('❌ [Database] Error details:', error.details);
      console.error('❌ [Database] Error hint:', error.hint);
      return NextResponse.json(
        { error: 'Erro ao buscar convites', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log('✅ [Database] Found', invitations?.length || 0, 'invitations');

    // Fetch invited_by user data separately for each invitation
    if (invitations && invitations.length > 0) {
      const inviterIds = [...new Set(invitations.map(inv => inv.invited_by))];
      const { data: inviters } = await supabase
        .from('users_unified')
        .select('id, email, first_name, last_name')
        .in('id', inviterIds);

      // Map inviter data to invitations
      const inviterMap = new Map(inviters?.map(u => [u.id, u]) || []);
      invitations.forEach(inv => {
        inv.invited_by_user = inviterMap.get(inv.invited_by) || null;
      });
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
      console.log('✅ [Auth] User tenant_id:', currentUser.tenant_id);
      console.log('✅ [Auth] User tenant_roles:', currentUser.tenant_roles);
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

    let {
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

    // FIX: Respect selected tenant context
    // If user has a selected tenant and tenant_ids is not explicitly provided or is empty,
    // automatically use the selected tenant
    if (currentUser.tenant_id && (!tenant_ids || tenant_ids.length === 0)) {
      console.log('🔧 [Tenant Context] Auto-assigning selected tenant:', currentUser.tenant_id);
      tenant_ids = [currentUser.tenant_id];
    }

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

    // Use service role client to bypass RLS for admin operations
    const supabase = getServiceSupabase();

    // Check if user already exists and is fully registered
    // We check users_unified first (the main user table), then verify if there's a complete registration
    console.log('🔍 [Database] Checking for existing user with email:', email.toLowerCase());
    
    // Check if user exists in users_unified (main user table)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users_unified')
      .select('id, email, active')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('❌ [Database] Error checking existing user:', userCheckError);
    }

    if (existingUser) {
      console.error('❌ [Validation] User already exists in users_unified:', existingUser.id);
      console.log('   - User active status:', existingUser.active);
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      );
    }

    // Also check if there's a profile with associated tenant roles (indicating complete registration)
    // Profiles created by trigger but without tenant roles are considered orphaned and can be invited
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileCheckError) {
      console.error('❌ [Database] Error checking existing profile:', profileCheckError);
    }

    if (existingProfile) {
      console.log('⚠️ [Database] Profile found, checking if user is fully registered:', existingProfile.user_id);
      
      // Check if this profile has associated tenant roles (indicating complete registration)
      const { data: tenantRoles, error: rolesError } = await supabase
        .from('tenant_user_roles')
        .select('id')
        .eq('user_id', existingProfile.user_id)
        .limit(1);

      if (rolesError) {
        console.error('❌ [Database] Error checking tenant roles:', rolesError);
      }

      // If profile exists but has no tenant roles, it's likely an orphaned profile
      // We'll allow the invitation to proceed as it will complete the registration
      if (tenantRoles && tenantRoles.length > 0) {
        console.error('❌ [Validation] User already exists in profiles with tenant roles:', existingProfile.user_id);
        return NextResponse.json(
          { error: 'Este email já está cadastrado no sistema' },
          { status: 400 }
        );
      }

      // Profile exists but no tenant roles - likely orphaned, allow invitation
      console.log('⚠️ [Database] Found orphaned profile (no tenant roles), allowing invitation to proceed');
    }
    
    console.log('✅ [Database] No fully registered user found');

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

    // Validate tenant_ids
    if (!tenant_ids || tenant_ids.length === 0) {
      console.error('❌ [Validation] No tenant_ids provided and no selected tenant');
      return NextResponse.json(
        { error: 'Pelo menos um tenant deve ser especificado' },
        { status: 400 }
      );
    }

    console.log('✅ [Validation] Tenant IDs validated:', tenant_ids);

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

    // Create invitation using service role client (bypasses RLS)
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
      // Get email context (locale + tenant branding)
      const primaryTenantId = tenant_ids && tenant_ids.length > 0 ? tenant_ids[0] : currentUser.tenant_id;
      const emailContext = await getEmailContextByEmail(email, primaryTenantId);

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${emailContext.locale}/auth/accept-invite?token=${token}`;

      const emailSubjects: Record<string, string> = {
        'pt-BR': 'Você foi convidado para o PontoFlow',
        'en-GB': 'You\'ve been invited to PontoFlow',
      };

      await sendEmail({
        to: email,
        subject: emailSubjects[emailContext.locale] || emailSubjects['pt-BR'],
        html: generateInvitationEmail({
          firstName: first_name,
          lastName: last_name,
          invitedBy: `${currentUser.first_name} ${currentUser.last_name}`,
          tenantName: emailContext.branding.companyNameOverride || emailContext.branding.tenantName,
          role,
          inviteUrl,
          expiresAt: invitation.expires_at,
          locale: emailContext.locale,
        }),
        tenantId: tenant_ids?.[0], // Use first tenant ID for SMTP config
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
  tenantName,
  role,
  inviteUrl,
  expiresAt,
  locale = 'pt-BR',
}: {
  firstName: string;
  lastName: string;
  invitedBy: string;
  tenantName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  locale?: string;
}) {
  const roleNames: Record<string, Record<string, string>> = {
    'pt-BR': {
      USER: 'Usuário',
      MANAGER_TIMESHEET: 'Gerente de Timesheet',
      MANAGER: 'Gerente',
      ADMIN: 'Administrador',
    },
    'en-GB': {
      USER: 'User',
      MANAGER_TIMESHEET: 'Timesheet Manager',
      MANAGER: 'Manager',
      ADMIN: 'Administrator',
    },
  };

  const translations: Record<string, any> = {
    'pt-BR': {
      title: 'Você foi convidado!',
      greeting: 'Olá',
      invitedText: 'convidou você para fazer parte do',
      systemDescription: 'o sistema de gerenciamento de timesheets.',
      yourRole: 'Sua função:',
      acceptInstructions: 'Para aceitar o convite e completar seu cadastro, clique no botão abaixo:',
      acceptButton: 'Aceitar Convite',
      orCopy: 'Ou copie e cole este link no seu navegador:',
      expiresText: 'Este convite expira em',
      footer: 'Todos os direitos reservados.',
    },
    'en-GB': {
      title: 'You\'ve been invited!',
      greeting: 'Hello',
      invitedText: 'has invited you to join',
      systemDescription: 'the timesheet management system.',
      yourRole: 'Your role:',
      acceptInstructions: 'To accept the invitation and complete your registration, click the button below:',
      acceptButton: 'Accept Invitation',
      orCopy: 'Or copy and paste this link into your browser:',
      expiresText: 'This invitation expires on',
      footer: 'All rights reserved.',
    },
  };

  const currentLocale = locale === 'en-GB' ? 'en-GB' : 'pt-BR';
  const t = translations[currentLocale];
  const roles = roleNames[currentLocale];

  const expiresDate = new Date(expiresAt).toLocaleDateString(currentLocale, {
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
      <title>${t.title} - PontoFlow</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${t.title}</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    ${t.greeting} <strong>${firstName} ${lastName}</strong>,
                  </p>

                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    <strong>${invitedBy}</strong> ${t.invitedText} <strong>${tenantName}</strong>,
                    ${t.systemDescription}
                  </p>

                  <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      <strong>${t.yourRole}</strong> ${roles[role] || role}
                    </p>
                  </div>

                  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                    ${t.acceptInstructions}
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          ${t.acceptButton}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                    ${t.orCopy}<br>
                    <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                  </p>

                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; font-size: 13px; color: #999999;">
                      ⏰ ${t.expiresText} <strong>${expiresDate}</strong>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #999999;">
                    © ${new Date().getFullYear()} ABZ Group - PontoFlow. ${t.footer}
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

