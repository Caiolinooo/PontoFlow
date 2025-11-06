import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin role
    const locale = 'pt-BR'; // Default locale, should be extracted from request
    await requireRole(locale, ['ADMIN']);

    const supabase = await getServerSupabase();

    // Try to fetch the BASE_URL from app_config table
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'BASE_URL')
      .single();

    if (error) {
      // If table doesn't exist or query fails, return default
      console.warn('Error fetching BASE_URL from app_config:', error);
      return NextResponse.json({ 
        baseUrl: 'http://localhost:3000',
        note: 'Using default value as app_config table is not available'
      });
    }

    return NextResponse.json({ 
      baseUrl: data?.value || 'http://localhost:3000'
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/config:', error);
    
    // Return default if any error occurs
    return NextResponse.json({ 
      baseUrl: 'http://localhost:3000',
      error: 'Database unavailable, using default'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin role
    const locale = 'pt-BR'; // Default locale, should be extracted from request
    await requireRole(locale, ['ADMIN']);

    const supabase = await getServerSupabase();
    
    // Parse request body
    let body = {};
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { baseUrl } = body as { baseUrl?: string };

    // Validate required fields
    if (!baseUrl) {
      return NextResponse.json({ 
        error: 'baseUrl is required' 
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (urlError) {
      return NextResponse.json({ 
        error: 'Invalid URL format' 
      }, { status: 400 });
    }

    // Update or insert the BASE_URL in app_config table
    const { data, error } = await supabase
      .from('app_config')
      .upsert(
        { key: 'BASE_URL', value: baseUrl },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating BASE_URL in app_config:', error);
      return NextResponse.json({
        error: 'Failed to update configuration in database',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'BASE_URL updated successfully',
      baseUrl: baseUrl
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/config:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}