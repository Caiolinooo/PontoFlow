import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

/**
 * Manual notification testing endpoint
 * 
 * This endpoint allows testing the notification system manually
 * Useful for testing SMTP configuration and template rendering
 * 
 * POST /api/notifications/test
 * Body: {
 *   type: 'deadline_reminder' | 'manager_pending_reminder',
 *   to: string (email address),
 *   locale?: 'pt-BR' | 'en-GB',
 *   data?: object (specific to notification type)
 * }
 * 
 * Authorization: Requires ADMIN or MANAGER role
 */

export async function POST(req: NextRequest) {
  try {
    // Handle empty body gracefully
    let body = {};
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { type, to, locale = 'pt-BR', data = {} } = body as any;

    // Validate required fields
    if (!type || !to) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, to' 
      }, { status: 400 });
    }

    // Validate notification type
    if (!['deadline_reminder', 'manager_pending_reminder'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid notification type. Use: deadline_reminder, manager_pending_reminder' 
      }, { status: 400 });
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    let notificationPayload;
    let subject;
    let html;

    try {
      switch (type) {
        case 'deadline_reminder': {
          // Default test data for deadline reminder
          const reminderData = {
            name: data.name || 'João Silva',
            periodLabel: data.periodLabel || '01/11/2025 - 15/11/2025',
            daysLeft: data.daysLeft || 3,
            url: data.url || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://pontoflow.app'}/pt-BR/employee/timesheets`,
            locale: locale as 'pt-BR' | 'en-GB'
          };

          const { subject: emailSubject, html: emailHtml } = await dispatchNotification({
            type: 'deadline_reminder',
            to,
            payload: reminderData
          });

          subject = emailSubject;
          html = emailHtml;
          notificationPayload = reminderData;
          break;
        }

        case 'manager_pending_reminder': {
          // Default test data for manager pending reminder
          const managerData = {
            managerName: data.managerName || 'Maria Santos',
            periodLabel: data.periodLabel || '01/11/2025 - 15/11/2025',
            employees: data.employees || [
              { name: 'João Silva' },
              { name: 'Pedro Oliveira' },
              { name: 'Ana Costa' }
            ],
            locale: locale as 'pt-BR' | 'en-GB'
          };

          const { subject: emailSubject, html: emailHtml } = await dispatchNotification({
            type: 'manager_pending_reminder',
            to,
            payload: managerData
          });

          subject = emailSubject;
          html = emailHtml;
          notificationPayload = managerData;
          break;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully',
        data: {
          type,
          to,
          subject,
          payload: notificationPayload,
          htmlPreview: html ? html.substring(0, 500) + '...' : null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (dispatchError: any) {
      console.error('Error dispatching notification:', dispatchError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send notification',
        details: dispatchError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to show available notification types and test data
 */
export async function GET() {
  return NextResponse.json({
    availableTypes: [
      {
        type: 'deadline_reminder',
        description: 'Deadline reminder for employees with pending timesheets',
        testData: {
          name: 'João Silva',
          periodLabel: '01/11/2025 - 15/11/2025',
          daysLeft: 3,
          url: 'https://pontoflow.app/pt-BR/employee/timesheets',
          locale: 'pt-BR'
        }
      },
      {
        type: 'manager_pending_reminder',
        description: 'Manager notification about team pending timesheets',
        testData: {
          managerName: 'Maria Santos',
          periodLabel: '01/11/2025 - 15/11/2025',
          employees: [
            { name: 'João Silva' },
            { name: 'Pedro Oliveira' }
          ],
          locale: 'pt-BR'
        }
      }
    ],
    smtpStatus: {
      configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      from: process.env.MAIL_FROM || 'no-reply@example.com'
    },
    example: {
      method: 'POST',
      endpoint: '/api/notifications/test',
      body: {
        type: 'deadline_reminder',
        to: 'test@example.com',
        locale: 'pt-BR',
        data: {
          name: 'João Silva',
          periodLabel: '01/11/2025 - 15/11/2025',
          daysLeft: 3
        }
      }
    }
  });
}