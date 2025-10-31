import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { sendEmail } from '@/lib/notifications/email-service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();

    // Only admins can test notifications
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { type, to, payload, testEmail } = body;

    console.log('[TEST NOTIFICATION] Request:', { type, to, testEmail });

    // Simple email test
    if (testEmail) {
      try {
        await sendEmail({
          to,
          subject: '🧪 Teste de Email - PontoFlow',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">✅ Teste de Email Bem-Sucedido!</h1>
              <p>Este é um email de teste do sistema PontoFlow.</p>
              <p><strong>Enviado para:</strong> ${to}</p>
              <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Se você recebeu este email, significa que a configuração SMTP está funcionando corretamente.
              </p>
            </div>
          `
        });
        console.log('[TEST NOTIFICATION] Email sent successfully');
        return NextResponse.json({
          success: true,
          message: 'Email de teste enviado com sucesso!',
          to
        });
      } catch (emailError: any) {
        console.error('[TEST NOTIFICATION] Email error:', emailError);
        return NextResponse.json({
          error: `Falha ao enviar email: ${emailError.message}`,
          details: emailError.stack
        }, { status: 500 });
      }
    }

    // Notification dispatch test
    if (!type || !to || !payload) {
      return NextResponse.json({ error: 'Missing required fields: type, to, payload' }, { status: 400 });
    }

    // Dispatch the notification
    await dispatchNotification({
      type,
      to,
      payload
    } as any);

    console.log('[TEST NOTIFICATION] Notification dispatched successfully');
    return NextResponse.json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('[TEST NOTIFICATION] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send notification',
      details: error.stack
    }, { status: 500 });
  }
}

