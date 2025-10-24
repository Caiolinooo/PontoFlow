import { requireRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getServerSupabase } from '@/lib/supabase/server';
import WorkScheduleManager from '@/components/admin/WorkScheduleManager';

export default async function WorkSchedulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN']);

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, work_schedule')
    .eq('id', user.tenant_id as string)
    .single();

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-800 p-4 rounded">
          Tenant não encontrado. Configure seu tenant primeiro.
        </div>
      </div>
    );
  }

  // Get all employees in tenant
  const { data: employees } = await supabase
    .from('employees')
    .select('id, profile_id')
    .eq('tenant_id', tenant.id);

  // Get profile names
  const profileIds = (employees ?? []).map((e: any) => e.profile_id);
  let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};

  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', profileIds);

    for (const p of profiles ?? []) {
      profilesMap[p.user_id] = { display_name: (p as any).display_name ?? null, email: p.email ?? null };
    }
  }

  const employeesList = (employees ?? []).map((e: any) => ({
    id: e.id,
    label: profilesMap[e.profile_id]?.display_name || profilesMap[e.profile_id]?.email || e.id,
  }));

  // Get all work schedule overrides
  const { data: schedules } = await supabase
    .from('employee_work_schedules')
    .select('*, employees(id, profile_id)')
    .in('employee_id', employeesList.map(e => e.id))
    .order('start_date', { ascending: false });

  const enrichedSchedules = (schedules ?? []).map((s: any) => ({
    ...s,
    employee_name: employeesList.find(e => e.id === s.employee_id)?.label || s.employee_id,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Escalas de Trabalho</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure as escalas de trabalho offshore (14x14, 7x7, 21x21, 28x28) para o tenant e exceções por colaborador.
        </p>
      </div>

      <WorkScheduleManager
        initialSchedules={enrichedSchedules}
        employees={employeesList}
        tenantSchedule={tenant.work_schedule || '14x14'}
        tenantId={tenant.id}
      />
    </div>
  );
}

