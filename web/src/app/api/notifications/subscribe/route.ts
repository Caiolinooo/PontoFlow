import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiAuth } from '@/lib/auth/server';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, anon);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const subscription = await req.json();
    const supabase = getSupabase();

    console.log('[SUBSCRIBE] User:', user.id, user.email);
    console.log('[SUBSCRIBE] Subscription:', subscription);

    if (!subscription.endpoint) {
      console.log('[SUBSCRIBE] ERROR: No endpoint provided');
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Check if user already has a subscription
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          endpoint: subscription.endpoint,
          auth: subscription.keys?.auth,
          p256dh: subscription.keys?.p256dh,
        })
        .eq('user_id', user.id);
      error = updateError;
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          auth: subscription.keys?.auth,
          p256dh: subscription.keys?.p256dh,
        });
      error = insertError;
    }

    if (error) {
      console.log('[SUBSCRIBE] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[SUBSCRIBE] Success!');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log('[SUBSCRIBE] Caught error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getSupabase();

    console.log('[UNSUBSCRIBE] User:', user.id, user.email);

    // Delete subscription from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.log('[UNSUBSCRIBE] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[UNSUBSCRIBE] Success!');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log('[UNSUBSCRIBE] Caught error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

