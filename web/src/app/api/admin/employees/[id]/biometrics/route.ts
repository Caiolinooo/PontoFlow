import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { canResetBiometrics } from '@/lib/biometrics/access';
import { logAudit } from '@/lib/audit/logger';

/**
 * DELETE /api/admin/employees/[id]/biometrics
 * Clears the face template for one employee in the admin's active tenant.
 * Platform ADMIN only. TENANT_ADMIN, MANAGER and USER receive 403.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(['ADMIN']);
    if (!canResetBiometrics(user.role)) {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    const { id: employeeId } = await params;
    const supabase = getServiceSupabase();
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('id', employeeId)
      .maybeSingle();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'employee_not_found' }, { status: 404 });
    }

    if (user.tenant_id && employee.tenant_id !== user.tenant_id) {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('employee_face_data')
      .delete()
      .eq('employee_id', employeeId);

    if (error) {
      console.error('Error resetting face data:', error);
      return NextResponse.json({ success: false, error: 'Failed to remove face data' }, { status: 500 });
    }

    if (employee.tenant_id) {
      await logAudit({
        tenantId: employee.tenant_id,
        userId: user.id,
        action: 'delete',
        resourceType: 'employee_face_data',
        resourceId: employeeId,
        oldValues: null,
        newValues: { reset: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { employee_id: employeeId, reset: true },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }
    console.error('Error resetting biometrics:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
