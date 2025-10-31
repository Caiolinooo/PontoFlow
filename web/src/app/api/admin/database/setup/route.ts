/**
 * Database Setup API Route
 * 
 * API para validação e configuração automática do banco de dados
 * Integra com o sistema de validação e setup
 * Timesheet Manager - ABZ Group
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { DatabaseValidator } from '@/lib/database-validator';
import { SqlGenerator } from '@/lib/sql-generator';
import { DatabaseSetup } from '@/lib/database-setup';

// POST /api/admin/database/setup - Executar setup completo
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Verificar autenticação e autorização
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se usuário é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { action, options } = body;

    // Obter credenciais do ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'validate': {
        // Apenas validar
        const validator = new DatabaseValidator(supabaseUrl, supabaseServiceKey);
        const report = await validator.validateDatabase();
        
        return NextResponse.json({ success: true, data: report });
      }

      case 'setup': {
        // Setup completo
        const setup = new DatabaseSetup(supabaseUrl, supabaseServiceKey, {
          autoFix: options?.autoFix ?? true,
          createBackup: options?.createBackup ?? true,
          enableRollback: options?.enableRollback ?? true,
        });

        const result = await setup.runFullSetup();
        return NextResponse.json({ success: true, data: result });
      }

      case 'status': {
        // Verificar status rápido
        const validator = new DatabaseValidator(supabaseUrl, supabaseServiceKey);
        const report = await validator.validateDatabase();
        
        const status = DatabaseSetup.generateValidationSummary(report);
        
        return NextResponse.json({ 
          success: true, 
          data: {
            score: status.score,
            status: status.status,
            message: status.message,
            actions: status.actions,
            summary: report.summary,
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Erro na API de database setup:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/database/setup - Verificar status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se usuário é admin (verificar role)
    const { data: tenantUserRoles } = await supabase
      .from('tenant_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'TENANT_ADMIN')
      .single();

    if (!tenantUserRoles) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Obter credenciais e verificar status
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    // Verificar status do banco
    const validator = new DatabaseValidator(supabaseUrl, supabaseKey);
    const report = await validator.validateDatabase();
    const status = DatabaseSetup.generateValidationSummary(report);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: report.timestamp,
        score: status.score,
        status: status.status,
        message: status.message,
        actions: status.actions,
        summary: report.summary,
        errors: report.errors,
        warnings: report.warnings,
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status do banco:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}