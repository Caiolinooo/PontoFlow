import { NextRequest, NextResponse } from 'next/server';
import { signInWithCredentials } from '@/lib/auth/custom-auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await signInWithCredentials(email, password);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    console.log('[SIGNIN API] Login successful, setting cookie with token:', result.token.substring(0, 20) + '...');

    // Create response with user data
    const response = NextResponse.json({
      user: result.user,
      success: true,
    });

    // Set session cookie on the response
    response.cookies.set('timesheet_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log('[SIGNIN API] Cookie set on response');

    return response;
  } catch (error) {
    console.error('Sign in API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

