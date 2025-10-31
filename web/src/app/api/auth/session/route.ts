import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('timesheet_session')?.value;

    if (!token) {
      return NextResponse.json({
        user: null,
        authenticated: false,
        message: 'No session token found'
      });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      // Invalid token, clear cookie
      cookieStore.set('timesheet_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/',
      });
      return NextResponse.json({
        user: null,
        authenticated: false,
        message: 'Invalid session token'
      });
    }

    // Enhanced response with user data and authentication status
    return NextResponse.json({
      user,
      authenticated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      {
        user: null,
        authenticated: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

