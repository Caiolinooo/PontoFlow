import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear the session cookie (using delete for more reliable cleanup)
    cookieStore.delete('timesheet_session');

    console.log('[SIGNOUT] User session cleared');

    return NextResponse.json({
      success: true,
      message: 'Successfully signed out',
    });
  } catch (error) {
    console.error('[SIGNOUT] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}