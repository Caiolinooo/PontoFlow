import {NextResponse} from 'next/server';
import {requireApiRole} from '@/lib/auth/server';
import {getServerSupabase} from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = await getServerSupabase();

    // ADMIN: vê tudo do tenant; Manager: apenas grupos delegados
    let data: any[] | null = null;
    let error: any = null;

    if (user.role === 'ADMIN') {
      const resp = await supabase
        .from('timesheets')
        .select('id,status,periodo_ini,periodo_fim,employee:employees(id,display_name)')
        .eq('tenant_id', user.tenant_id as string)
        .eq('status', 'enviado')
        .order('periodo_ini', {ascending: false});
      data = resp.data; error = resp.error;
    } else {
      // grupos do gerente
      // Nota: após migração phase-22, tenant_id estará disponível diretamente
      // Por enquanto, suportamos ambas as abordagens (com e sem tenant_id)
      const { data: mgrGroups } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('manager_id', user.id)
        .eq('tenant_id', user.tenant_id as string);

      const groupIds = [...new Set((mgrGroups ?? []).map(g => g.group_id))];

      if (groupIds.length === 0) {
        return NextResponse.json({ items: [], total: 0 }, { status: 200 });
      }

      // employees nesses grupos
      // Nota: após migração phase-22, tenant_id estará disponível diretamente
      const { data: memberships } = await supabase
        .from('employee_group_members')
        .select('employee_id')
        .in('group_id', groupIds)
        .eq('tenant_id', user.tenant_id as string);

      const employeeIds = [...new Set((memberships ?? []).map(m => m.employee_id))];

      if (employeeIds.length === 0) {
        return NextResponse.json({ items: [], total: 0 }, { status: 200 });
      }

      const resp = await supabase
        .from('timesheets')
        .select('id,status,periodo_ini,periodo_fim,employee:employees(id,display_name)')
        .eq('tenant_id', user.tenant_id as string)
        .eq('status', 'enviado')
        .in('employee_id', employeeIds)
        .order('periodo_ini', {ascending: false});
      data = resp.data; error = resp.error;
    }

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({items: data ?? [], total: data?.length ?? 0}, {status: 200});
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      const status = error.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({error: error.message.toLowerCase()}, {status});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

