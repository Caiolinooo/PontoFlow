import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * POST /api/employee/face-recognition/verify
 * Verify a timesheet entry using facial recognition
 * 
 * Body:
 * {
 *   entry_id: string;
 *   employee_id: string;
 *   face_encoding: string; // Base64 encoded face embedding to compare
 *   gps_latitude?: number;
 *   gps_longitude?: number;
 *   device_info?: object;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();

    const {
      entry_id,
      employee_id,
      face_encoding,
      gps_latitude,
      gps_longitude,
      device_info,
    } = body;

    if (!entry_id || !employee_id || !face_encoding) {
      return NextResponse.json(
        { error: 'entry_id, employee_id, and face_encoding are required' },
        { status: 400 }
      );
    }

    // Get stored face data for employee
    const { data: storedFace, error: faceError } = await supabase
      .from('employee_face_data')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (faceError) {
      console.error('Error fetching face data:', faceError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!storedFace) {
      return NextResponse.json(
        { error: 'No face data registered for this employee' },
        { status: 404 }
      );
    }

    // TODO: Implement actual face comparison algorithm
    // For now, we'll simulate a match score
    // In production, this would call a face recognition service (AWS Rekognition, Azure Face API, etc.)
    const faceMatchScore = simulateFaceMatch(storedFace.face_encoding, face_encoding);
    const isVerified = faceMatchScore >= 0.85; // 85% threshold

    // Create verification record
    const { data: verification, error: verifyError } = await supabase
      .from('timesheet_entry_verifications')
      .insert({
        entry_id,
        employee_id,
        verification_method: 'facial_recognition',
        face_match_score: faceMatchScore,
        gps_latitude: gps_latitude || null,
        gps_longitude: gps_longitude || null,
        device_info: device_info || null,
        is_verified: isVerified,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (verifyError) {
      console.error('Error creating verification:', verifyError);
      return NextResponse.json(
        { error: 'Failed to create verification record' },
        { status: 500 }
      );
    }

    // Update last_verified_at on face data
    if (isVerified) {
      await supabase
        .from('employee_face_data')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', storedFace.id);
    }

    return NextResponse.json({
      success: true,
      is_verified: isVerified,
      match_score: faceMatchScore,
      verification: verification,
    });
  } catch (error) {
    console.error('Error in face verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Simulate face matching algorithm
 * In production, replace with actual face recognition service
 */
function simulateFaceMatch(storedEncoding: string, providedEncoding: string): number {
  // This is a placeholder - in production, use a real face recognition algorithm
  // For now, return a random score between 0.7 and 1.0 for testing
  return 0.7 + Math.random() * 0.3;
}

