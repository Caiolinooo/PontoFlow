import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';

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
    const body = await req.json();
    const supabase = getSupabase();

    const { notification_ids, mark_all_read } = body;

    if (mark_all_read) {
      // Mark all notifications as read for this user
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('[notifications/mark-read] Error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, mock: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('id', notification_ids)
        .eq('read', false);

      if (error) {
        console.error('[notifications/mark-read] Error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, mock: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Either notification_ids array or mark_all_read flag required' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[notifications/mark-read] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}