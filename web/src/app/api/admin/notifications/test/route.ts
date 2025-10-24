import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    
    // Only admins can test notifications
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { type, to, payload } = body;

    if (!type || !to || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Dispatch the notification
    await dispatchNotification({
      type,
      to,
      payload
    } as any);

    return NextResponse.json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}

