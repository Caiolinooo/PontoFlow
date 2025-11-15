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

    console.log('[SIGNIN] Login successful for user:', result.user.email);
    console.log('[SIGNIN] Generated token (first 20 chars):', result.token.substring(0, 20) + '...');
    console.log('[SIGNIN] User ID:', result.user.id);
    console.log('[SIGNIN] User role:', result.user.role);

    // Create response with user data
    const response = NextResponse.json({
      user: result.user,
      success: true,
    });

    // Set session cookie on the response
    // IMPORTANT: secure should be false in development (HTTP) and true in production (HTTPS)
    // If NODE_ENV is not set, assume development
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    };

    console.log('[SIGNIN] Setting cookie with options:', {
      ...cookieOptions,
      token: result.token.substring(0, 20) + '...',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      isProduction: isProduction
    });

    response.cookies.set('timesheet_session', result.token, cookieOptions);

    console.log('[SIGNIN] Cookie set successfully, returning response');
    return response;
  } catch (error) {
    console.error('[SIGNIN] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

