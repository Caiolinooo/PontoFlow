import { NextRequest, NextResponse } from 'next/server';
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
      .select('id, tenant_id')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Deactivate any existing face data for this employee
    await supabase
      .from('employee_face_data')
      .update({ is_active: false })
      .eq('employee_id', employee_id);

    // Insert new face data
    const { data: faceData, error: insertError } = await supabase
      .from('employee_face_data')
      .insert({
        employee_id,
        face_encoding,
        face_image_url: face_image_url || null,
        confidence_score: confidence_score || null,
        is_active: true,
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting face data:', insertError);
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
    console.error('Error in face registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

