import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users_unified')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Check if there's a pending invitation
    const { data: pendingInvitation } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    return NextResponse.json({
      exists: !!existingUser,
      hasPendingInvitation: !!pendingInvitation,
    });
  } catch (error: any) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: error.message || 'Error checking email' },
      { status: error.status || 500 }
    );
  }
}

