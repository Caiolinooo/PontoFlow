import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth/custom-auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('timesheet_session')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      // Invalid token, clear cookie
      cookieStore.delete('timesheet_session');
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

