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

const defaultPrefs = {
  emailNotifications: true,
  pushNotifications: false,
  deadlineReminders: true,
  approvalNotifications: true,
  rejectionNotifications: true,
};

export async function GET() {
  try {
    const user = await requireApiAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select(
        'email_notifications, push_notifications, deadline_reminders, approval_notifications, rejection_notifications'
      )
      .eq('user_id', user.id)
      .single();

    // PGRST116 = no rows returned (user has no preferences yet)
    if (error && error.code !== 'PGRST116') {
      console.error('[notifications/preferences] Database error:', error);
      // Return default preferences instead of error if table doesn't exist
      if (error.code === '42P01') {
        // Table doesn't exist
        console.warn('[notifications/preferences] Table notification_preferences does not exist, returning defaults');
        return NextResponse.json({ preferences: defaultPrefs }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ preferences: defaultPrefs }, { status: 200 });
    }

    return NextResponse.json(
      {
        preferences: {
          emailNotifications: !!data.email_notifications,
          pushNotifications: !!data.push_notifications,
          deadlineReminders: !!data.deadline_reminders,
          approvalNotifications: !!data.approval_notifications,
          rejectionNotifications: !!data.rejection_notifications,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[notifications/preferences] Error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    // Return default preferences instead of error
    return NextResponse.json({ preferences: defaultPrefs }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body: unknown = await req.json().catch(() => ({}));
    const supabase = getSupabase();

    const prefs = body as Partial<{
      emailNotifications: boolean;
      pushNotifications: boolean;
      deadlineReminders: boolean;
      approvalNotifications: boolean;
      rejectionNotifications: boolean;
    }>;

    const payload = {
      user_id: user.id,
      email_notifications: !!prefs.emailNotifications,
      push_notifications: !!prefs.pushNotifications,
      deadline_reminders: !!prefs.deadlineReminders,
      approval_notifications: !!prefs.approvalNotifications,
      rejection_notifications: !!prefs.rejectionNotifications,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

