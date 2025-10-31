import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

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
    const supabase = getServiceSupabase();

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
      } : null,
      recent_verifications: verifications || [],
      verification_stats: {
        total: verifications?.length || 0,
        verified: verifications?.filter((v: any) => v.is_verified).length || 0,
        failed: verifications?.filter((v: any) => !v.is_verified).length || 0,
      },
    });
  } catch (error) {
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
    const supabase = getServiceSupabase();

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
    console.error('Error removing face data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

