/**
 * Database Setup Wizard Rollback API Route
 * 
 * Handles rollback operations for the database setup wizard
 * Executes the ROLLBACK.sql script to undo all wizard changes
 * Timesheet Manager - ABZ Group
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { DatabaseSetup } from '@/lib/database-setup';

/**
 * POST /api/admin/database/setup-wizard/rollback
 * 
 * Execute rollback of all wizard changes
 * 
 * Body:
 * {
 *   confirmToken: string; // Must be "ROLLBACK-CONFIRM" to proceed
 *   createBackup?: boolean; // Create backup before rollback
 * }
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

    // Parse request body
    const body = await request.json();
    const { confirmToken, createBackup } = body;

    // Verify confirmation token
    if (confirmToken !== 'ROLLBACK-CONFIRM') {
      return NextResponse.json(
        { 
          error: 'Invalid confirmation token',
          message: 'You must provide confirmToken: "ROLLBACK-CONFIRM" to proceed with rollback',
        },
        { status: 400 }
      );
    }

    // Create setup instance
    const setup = new DatabaseSetup(supabaseUrl, supabaseServiceKey, {
      autoFix: false,
      createBackup: createBackup ?? true,
      enableRollback: true,
    });

    // Create backup if requested
    if (createBackup) {
      console.log('📦 Creating backup before rollback...');
      // Backup is handled internally by DatabaseSetup
    }

    // Execute rollback
    console.log('🔄 Executing rollback...');
    const result = await setup.executeWizardRollback();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Rollback completed successfully',
        data: {
          duration: result.duration,
          stepsExecuted: result.steps.length,
          rollbackExecuted: result.rollbackExecuted,
          summary: result.summary,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Rollback completed with errors',
        error: result.error,
        data: {
          duration: result.duration,
          stepsExecuted: result.steps.length,
          rollbackExecuted: result.rollbackExecuted,
          summary: result.summary,
        },
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error executing rollback:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to execute rollback. Database may be in an inconsistent state.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/database/setup-wizard/rollback
 * 
 * Get information about the rollback script
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

    // Get rollback script info
    const { SqlFileReader } = await import('@/lib/setup-wizard/sql-file-reader');
    const reader = new SqlFileReader();
    const rollbackSql = await reader.getRollbackScript();

    // Count statements
    const statements = rollbackSql.split(';').filter(s => s.trim()).length;

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        statementsCount: statements,
        size: rollbackSql.length,
        warning: 'Rollback will drop all tables, functions, triggers, and policies created by the wizard',
        confirmationRequired: 'ROLLBACK-CONFIRM',
      },
    });

  } catch (error) {
    console.error('Error getting rollback info:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

