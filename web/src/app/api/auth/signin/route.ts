import { NextRequest, NextResponse } from 'next/server';
import { signInWithCredentials } from '@/lib/auth/custom-auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('[SIGNIN API] ========== SIGNIN REQUEST START ==========');
    const { email, password } = await request.json();
    console.log('[SIGNIN API] Email:', email);

    if (!email || !password) {
      console.log('[SIGNIN API] Missing email or password');
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('[SIGNIN API] Calling signInWithCredentials...');
    const result = await signInWithCredentials(email, password);

    if ('error' in result) {
      console.log('[SIGNIN API] Login failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    console.log('[SIGNIN API] ✓ Login successful!');
    console.log('[SIGNIN API] User ID:', result.user.id);
    console.log('[SIGNIN API] User role:', result.user.role);
    console.log('[SIGNIN API] Token (first 30 chars):', result.token.substring(0, 30) + '...');
    console.log('[SIGNIN API] Token length:', result.token.length);

    // Create response with user data
    const response = NextResponse.json({
      user: result.user,
      success: true,
    });

    // Set session cookie on the response
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    };

    console.log('[SIGNIN API] Setting cookie with options:', JSON.stringify(cookieOptions));
    response.cookies.set('timesheet_session', result.token, cookieOptions);

    console.log('[SIGNIN API] ✓ Cookie set on response');
    console.log('[SIGNIN API] ========== SIGNIN REQUEST END ==========');

    return response;
  } catch (error) {
    console.error('[SIGNIN API] ✗ Exception:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

