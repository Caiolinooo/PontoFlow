import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('timesheet_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sign out API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

