import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

type AccessCheck = { supabase: ReturnType<typeof getServiceSupabase>; error?: never } | { supabase?: never; error: NextResponse };

// Biometric templates are sensitive: only the employee themself (or an ADMIN)
// may read status/encoding or deactivate registration.
async function assertFaceAccess(employee_id: string): Promise<AccessCheck> {
  const user = await requireApiAuth();
  const supabase = getServiceSupabase();
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, profile_id')
    .eq('id', employee_id)
    .single();
  if (error || !employee) {
    return { error: NextResponse.json({ error: 'employee_not_found' }, { status: 404 }) };
  }
  if (user.role !== 'ADMIN' && employee.profile_id !== user.id) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { supabase };
}

/**
 * GET /api/employee/face-recognition/status/[employee_id]
 * Get facial recognition registration status for an employee
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employee_id: string }> }
) {
  try {
    const { employee_id } = await params;
    const access = await assertFaceAccess(employee_id);
    if (access.error) return access.error;
    const supabase = access.supabase;

    // Get active face data
    const { data: faceData, error: faceError } = await supabase
      .from('employee_face_data')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('is_active', true)
      .maybeSingle();

    if (faceError) {
      console.error('Error fetching face data:', faceError);
      return NextResponse.json(
        { error: 'Failed to fetch face data' },
        { status: 500 }
      );
    }

    // Get verification history
    const { data: verifications, error: verifyError } = await supabase
      .from('timesheet_entry_verifications')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('verification_method', 'facial_recognition')
      .order('verified_at', { ascending: false })
      .limit(10);

    if (verifyError) {
      console.error('Error fetching verifications:', verifyError);
    }

    return NextResponse.json({
      is_registered: !!faceData,
      face_data: faceData ? {
        id: faceData.id,
        registered_at: faceData.registered_at,
        last_verified_at: faceData.last_verified_at,
        confidence_score: faceData.confidence_score,
        face_image_url: faceData.face_image_url,
        face_encoding: faceData.face_encoding,
      } : null,
      recent_verifications: verifications || [],
      verification_stats: {
        total: verifications?.length || 0,
        verified: verifications?.filter((v: any) => v.is_verified).length || 0,
        failed: verifications?.filter((v: any) => !v.is_verified).length || 0,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('Error in face recognition status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employee/face-recognition/status/[employee_id]
 * Remove facial recognition data for an employee
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ employee_id: string }> }
) {
  try {
    const { employee_id } = await params;
    const access = await assertFaceAccess(employee_id);
    if (access.error) return access.error;
    const supabase = access.supabase;

    // Deactivate face data
    const { error } = await supabase
      .from('employee_face_data')
      .update({ is_active: false })
      .eq('employee_id', employee_id);

    if (error) {
      console.error('Error deactivating face data:', error);
      return NextResponse.json(
        { error: 'Failed to remove face data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Face data removed successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('Error removing face data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

