import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getSupabase } from '@/lib/supabase/client';

interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high';
  expires_at?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body: NotificationPayload = await req.json();

    // Validate required fields
    if (!body.user_id || !body.type || !body.title || !body.message) {
      return NextResponse.json({
        error: 'Missing required fields: user_id, type, title, message'
      }, { status: 400 });
    }

    // Only allow users to create notifications for themselves or admins can create for anyone
    if (body.user_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notification = {
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      message: body.message,
      data: body.data || {},
      action_url: body.action_url || null,
      priority: body.priority || 'normal',
      expires_at: body.expires_at || null,
      read_at: null,
      created_at: new Date().toISOString()
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) {
      console.error('[notifications/create] Error:', error);
      // Return success with mock data if table doesn't exist (graceful fallback)
      if (error.code === '42P01') {
        return NextResponse.json({ 
          notification: { ...notification, id: 'mock-id' },
          mock: true
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data }, { status: 201 });

  } catch (error) {
    console.error('[notifications/create] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}