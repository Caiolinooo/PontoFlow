import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email-service';
import { getBaseUrlSync } from '@/lib/base-url';

// DELETE - Cancel invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiRole(['ADMIN']);
    const { id } = await params;

    const supabase = await getServerSupabase();

    // Update invitation status to cancelled
    const { error } = await supabase
      .from('user_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending'); // Only cancel pending invitations

    if (error) {
      console.error('Error cancelling invitation:', error);
      return NextResponse.json(
        { error: 'Erro ao cancelar convite' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar convite' },
      { status: error.status || 500 }
    );
  }
}

// POST - Resend invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireApiRole(['ADMIN']);
    const { id } = await params;

    const supabase = await getServerSupabase();

    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Apenas convites pendentes podem ser reenviados' },
        { status: 400 }
      );
    }

    // Update expires_at to extend the invitation
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar convite' },
        { status: 500 }
      );
    }

    // Resend invitation email
    try {
      const userLocale = 'pt-BR';
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || getBaseUrlSync()}/${userLocale}/auth/accept-invite?token=${invitation.token}`;

      const roleNames: Record<string, string> = {
        USER: 'Usuário',
        MANAGER_TIMESHEET: 'Gerente de Timesheet',
        MANAGER: 'Gerente',
        ADMIN: 'Administrador',
      };

      await sendEmail({
        to: invitation.email,
        subject: 'Lembrete: Convite PontoFlow',
        html: generateReminderEmail({
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          invitedBy: `${currentUser.first_name} ${currentUser.last_name}`,
          role: roleNames[invitation.role] || invitation.role,
          inviteUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    } catch (emailError) {
      console.error('Error sending reminder email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST resend invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao reenviar convite' },
      { status: error.status || 500 }
    );
  }
}

// Helper function to generate reminder email HTML
function generateReminderEmail({
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
      <title>Lembrete - Convite PontoFlow</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Lembrete de Convite</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    Olá <strong>${firstName} ${lastName}</strong>,
                  </p>

                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                    Este é um lembrete de que você foi convidado por <strong>${invitedBy}</strong>
                    para fazer parte do <strong>PontoFlow</strong>.
                  </p>

                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>Atenção:</strong> Este convite expira em <strong>${expiresDate}</strong>
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                    Para aceitar o convite e completar seu cadastro, clique no botão abaixo:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          Aceitar Convite Agora
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                  </p>
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