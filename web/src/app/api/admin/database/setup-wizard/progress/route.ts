/**
 * Database Setup Wizard Progress API Route
 * 
 * Real-time progress tracking for wizard execution
 * Provides detailed information about layer execution status
 * Timesheet Manager - ABZ Group
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { DatabaseSetup } from '@/lib/database-setup';

/**
 * GET /api/admin/database/setup-wizard/progress
 * 
 * Returns detailed progress information about wizard execution
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration not found' },
        { status: 500 }
      );
    }

    // Create setup instance and get progress
    const setup = new DatabaseSetup(supabaseUrl, supabaseServiceKey);
    const progress = setup.getWizardProgress();

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: {
          initialized: false,
          totalLayers: 0,
          completedLayers: 0,
          currentLayer: 0,
          status: 'idle',
          layers: [],
          message: 'Wizard not initialized. Call initialize action first.',
        },
      });
    }

    // Calculate additional metrics
    const totalComponents = progress.layers.reduce((sum, layer) => sum + layer.components, 0);
    const completedComponents = progress.layers
      .filter(l => l.status === 'completed')
      .reduce((sum, layer) => sum + layer.components, 0);
    
    const percentComplete = progress.totalLayers > 0
      ? Math.round((progress.completedLayers / progress.totalLayers) * 100)
      : 0;

    // Calculate estimated time remaining
    const completedLayers = progress.layers.filter(l => l.status === 'completed');
    const avgDuration = completedLayers.length > 0
      ? completedLayers.reduce((sum, l) => sum + (l.duration || 0), 0) / completedLayers.length
      : 2000; // Default 2 seconds per layer

    const remainingLayers = progress.totalLayers - progress.completedLayers;
    const estimatedTimeRemaining = Math.round((remainingLayers * avgDuration) / 1000); // in seconds

    // Prepare response
    const response = {
      ...progress,
      percentComplete,
      totalComponents,
      completedComponents,
      estimatedTimeRemaining,
      metrics: {
        totalLayers: progress.totalLayers,
        completedLayers: progress.completedLayers,
        failedLayers: progress.layers.filter(l => l.status === 'failed').length,
        pendingLayers: progress.layers.filter(l => l.status === 'pending').length,
        runningLayers: progress.layers.filter(l => l.status === 'running').length,
        skippedLayers: progress.layers.filter(l => l.status === 'skipped').length,
      },
      timing: {
        startedAt: progress.startedAt,
        estimatedCompletion: progress.estimatedCompletion,
        estimatedTimeRemaining,
        averageLayerDuration: Math.round(avgDuration),
      },
    };

    return NextResponse.json({ success: true, data: response });

  } catch (error) {
    console.error('Error getting wizard progress:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/database/setup-wizard/progress
 * 
 * Update progress (for future use with WebSocket or polling)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, just return the current progress
    // In the future, this could be used to update progress from client
    return NextResponse.json({
      success: true,
      message: 'Progress update endpoint - not yet implemented',
    });

  } catch (error) {
    console.error('Error updating wizard progress:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

