import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * Verifies that all critical environment variables are configured
 *
 * Access: GET /api/health
 */
export async function GET() {
  const checks = {
    // Critical variables
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: !!process.env.JWT_SECRET,
    cronSecret: !!process.env.CRON_SECRET,

    // Optional but recommended
    baseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };

  const criticalVars = [
    'supabaseUrl',
    'supabaseAnon',
    'supabaseService',
    'jwtSecret',
    'cronSecret'
  ];

  const criticalMissing = criticalVars.filter(key => !checks[key as keyof typeof checks]);
  const allCriticalOk = criticalMissing.length === 0;

  return NextResponse.json({
    status: allCriticalOk ? 'healthy' : 'unhealthy',
    checks,
    critical: {
      ok: allCriticalOk,
      missing: criticalMissing
    },
    message: allCriticalOk
      ? 'All critical environment variables configured correctly'
      : `Missing critical variables: ${criticalMissing.join(', ')}`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
