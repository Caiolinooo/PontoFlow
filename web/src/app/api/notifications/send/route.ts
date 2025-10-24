import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Send push notification to user
 * Only callable from server-side (cron jobs, etc.)
 */
export async function POST(req: NextRequest) {
  // Verify authorization header (for cron jobs)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0 }, { status: 200 });
    }

    // Send push notification to each subscription
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(sub, {
          title,
          body,
          data: data || {},
        })
      )
    );

    const sent = results.filter((r) => r).length;

    return NextResponse.json({ success: true, sent }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Send push notification to a subscription
 */
async function sendPushNotification(
  subscription: { endpoint: string },
  payload: { title: string; body: string; data: Record<string, unknown> }
): Promise<boolean> {
  try {
    // In production, use web-push library
    // For now, just log
    console.log('Sending push notification:', {
      endpoint: subscription.endpoint,
      payload,
    });

    return true;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return false;
  }
}

