/**
 * Database Setup Wizard API Route
 * 
 * API endpoint for step-by-step database setup using migration scripts
 * Supports execute, validate, status, and dry-run operations
 * Timesheet Manager - ABZ Group
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { DatabaseSetup } from '@/lib/database-setup';
import { DatabaseValidator } from '@/lib/database-validator';

/**
 * POST /api/admin/database/setup-wizard
 * 
 * Actions:
 * - execute: Execute a specific layer or all layers
 * - validate: Validate database structure
 * - status: Get current wizard status
 * - dry-run: Preview what would be executed
 * - initialize: Initialize wizard and load layers
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

    const body = await request.json();
    const { action, options } = body;

    // Initialize DatabaseSetup instance
    const setup = new DatabaseSetup(supabaseUrl, supabaseServiceKey, {
      autoFix: options?.autoFix ?? false,
      createBackup: options?.createBackup ?? false,
      enableRollback: options?.enableRollback ?? true,
    });

    switch (action) {
      case 'initialize': {
        // Initialize wizard and load all layers
        const progress = await setup.initializeWizard();
        return NextResponse.json({ success: true, data: progress });
      }

      case 'execute': {
        // Execute a specific layer
        const { layer, createBackup, dryRun, skipValidation } = options || {};
        
        if (!layer) {
          return NextResponse.json(
            { error: 'Layer number is required' },
            { status: 400 }
          );
        }

        const result = await setup.runWizardStep({
          layer,
          createBackup: createBackup ?? false,
          dryRun: dryRun ?? false,
          skipValidation: skipValidation ?? false,
        });

        return NextResponse.json({ success: true, data: result });
      }

      case 'validate': {
        // Validate database structure
        const validator = new DatabaseValidator(supabaseUrl, supabaseServiceKey);
        const report = await validator.validateDatabase();
        
        return NextResponse.json({ success: true, data: report });
      }

      case 'status': {
        // Get current wizard status
        const progress = setup.getWizardProgress();
        
        if (!progress) {
          return NextResponse.json({
            success: true,
            data: {
              initialized: false,
              message: 'Wizard not initialized. Call initialize action first.',
            },
          });
        }

        return NextResponse.json({ success: true, data: progress });
      }

      case 'dry-run': {
        // Preview what would be executed
        const { layer } = options || {};
        
        if (!layer) {
          return NextResponse.json(
            { error: 'Layer number is required' },
            { status: 400 }
          );
        }

        const result = await setup.dryRun(layer);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: initialize, execute, validate, status, dry-run' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in setup wizard API:', error);
    
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
 * GET /api/admin/database/setup-wizard
 * 
 * Get current wizard status
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

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration not found' },
        { status: 500 }
      );
    }

    // Create setup instance and get status
    const setup = new DatabaseSetup(supabaseUrl, supabaseServiceKey);
    const progress = setup.getWizardProgress();

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: {
          initialized: false,
          message: 'Wizard not initialized',
        },
      });
    }

    return NextResponse.json({ success: true, data: progress });

  } catch (error) {
    console.error('Error getting wizard status:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

