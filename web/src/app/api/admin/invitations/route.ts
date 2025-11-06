import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/notifications/email-service';
import { getEmailContextByEmail } from '@/lib/notifications/email-context';
import crypto from 'crypto';
import { getBaseUrlSync } from '@/lib/base-url';

// GET - List all invitations
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/admin/invitations] Request received');

    const currentUser = await requireApiRole(['ADMIN']);
    console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);