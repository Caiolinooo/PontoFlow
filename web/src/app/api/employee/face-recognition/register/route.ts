import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * POST /api/employee/face-recognition/register
 * Register facial recognition data for an employee
 * 
 * Body:
 * {
 *   employee_id: string;
 *   face_encoding: string; // Base64 encoded face embedding
 *   face_image_url?: string; // Optional URL to face image
 *   confidence_score?: number;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();

    const body = await req.json();
    const { employee_id, face_encoding, face_image_url, confidence_score } = body;

    if (!employee_id || !face_encoding) {
      return NextResponse.json(
        { error: 'employee_id and face_encoding are required' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, profile_id')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Only the employee themself (or an ADMIN) may enroll/replace a face template
    if (user.role !== 'ADMIN' && employee.profile_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Upsert on the unique employee_id key: re-enrollment (new device, re-register)
    // must replace the previous encoding instead of violating the constraint.
    const { data: faceData, error: upsertError } = await supabase
      .from('employee_face_data')
      .upsert(
        {
          employee_id,
          face_encoding,
          face_image_url: face_image_url || null,
          confidence_score: confidence_score || null,
          is_active: true,
          registered_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting face data:', upsertError);
      return NextResponse.json(
        { error: 'Failed to register face data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faceData,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('Error in face registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

