import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    
    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json({error: 'forbidden'}, {status: 403});
    }

    const supabase = getServiceSupabase();

    // Drop the existing constraint
    const { error: dropError } = await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE public.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;'
    });

    if (dropError) {
      console.error('❌ Failed to drop constraint:', dropError);
      return NextResponse.json({error: dropError.message}, {status: 400});
    }

    // Create the new constraint
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: `ALTER TABLE public.timesheet_entries 
ADD CONSTRAINT timesheet_entries_tipo_check 
CHECK (tipo IS NULL OR tipo IN (
    'inicio', 'pausa', 'fim', 'embarque', 'desembarque', 'espera', 
    'refeicao', 'trabalho', 'ferias', 'licenca', 'doenca', 
    'treinamento', 'manutencao', 'viagem', 'administrativo'
));`
    });

    if (createError) {
      console.error('❌ Failed to create constraint:', createError);
      return NextResponse.json({error: createError.message}, {status: 400});
    }

    return NextResponse.json({
      ok: true,
      message: 'Successfully fixed timesheet_entries_tipo_check constraint'
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}