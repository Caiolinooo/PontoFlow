import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getSupabase } from '@/lib/supabase/client';

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const { searchParams } = new URL(req.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabase() as any;
    
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      // Delete all notifications for this user
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('[notifications/delete] Error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, mock: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (notificationId) {
      // Delete specific notification
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[notifications/delete] Error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, mock: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Notification ID or delete_all flag required' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[notifications/delete] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}