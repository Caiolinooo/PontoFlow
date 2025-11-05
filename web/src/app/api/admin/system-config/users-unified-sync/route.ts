import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';

/**
 * GET /api/admin/system-config/users-unified-sync
 * Get current users_unified sync status
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const currentUser = await requireApiAuth();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabase();

    // Get current sync status from system_config
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'enable_users_unified_sync')
      .maybeSingle();

    if (error) {
      console.error('[SYNC CONFIG] Error fetching config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync configuration' },
        { status: 500 }
      );
    }

    const enabled = data?.value === 'true';

    return NextResponse.json({
      enabled,
      key: 'enable_users_unified_sync',
      value: data?.value || 'false',
    });
  } catch (error) {
    console.error('[SYNC CONFIG] Unexpected error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/system-config/users-unified-sync
 * Update users_unified sync status
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const currentUser = await requireApiAuth();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: enabled must be a boolean' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Update sync status using the database function
    const { data, error } = await supabase.rpc('set_users_unified_sync', {
      enabled,
    });

    if (error) {
      console.error('[SYNC CONFIG] Error updating config:', error);
      return NextResponse.json(
        { error: 'Failed to update sync configuration' },
        { status: 500 }
      );
    }

    console.log('[SYNC CONFIG] Sync status updated:', {
      enabled,
      result: data,
      updatedBy: currentUser.email,
    });

    return NextResponse.json({
      success: true,
      enabled,
      message: data,
    });
  } catch (error) {
    console.error('[SYNC CONFIG] Unexpected error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

