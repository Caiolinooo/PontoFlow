import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  FACE_DESCRIPTOR_LENGTH,
  FACE_MATCH_THRESHOLD,
  matchFaceDescriptors,
  parseFaceDescriptor,
} from '@/lib/biometrics/descriptor';

/**
 * POST /api/employee/face-recognition/verify
 * Server-side facial verification for punch (marcação de ponto).
 *
 * The live descriptor captured on the device is compared against the stored
 * template HERE (never trust a client-reported score). Every attempt — success
 * or failure — is persisted in timesheet_entry_verifications for audit, and a
 * successful verification returns a verification_id that MUST be presented when
 * creating the timesheet entry (single use, short-lived).
 *
 * Body:
 * {
 *   employee_id: string;
 *   face_encoding: number[] | string; // 128-d face-api descriptor (array or JSON)
 *   gps_latitude?: number;
 *   gps_longitude?: number;
 *   device_info?: object;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();
    const body = await req.json();

    const { employee_id, face_encoding, gps_latitude, gps_longitude, device_info } = body;

    if (!employee_id || !face_encoding) {
      return NextResponse.json(
        { error: 'employee_id and face_encoding are required' },
        { status: 400 }
      );
    }

    // Ownership: the caller may only verify as their own employee record
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, profile_id')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && employee.profile_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Stored template
    const { data: storedFace, error: faceError } = await supabase
      .from('employee_face_data')
      .select('id, face_encoding')
      .eq('employee_id', employee_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (faceError) {
      console.error('Error fetching face data:', faceError);
      return NextResponse.json({ error: 'Failed to fetch face data' }, { status: 500 });
    }

    if (!storedFace) {
      return NextResponse.json({ error: 'face_not_registered' }, { status: 404 });
    }

    const storedDescriptor = parseFaceDescriptor(storedFace.face_encoding);
    const liveDescriptor = parseFaceDescriptor(face_encoding);

    if (!storedDescriptor || !liveDescriptor) {
      return NextResponse.json(
        { success: false, error: 'invalid_face_encoding', details: `expected ${FACE_DESCRIPTOR_LENGTH}-d numeric descriptor` },
        { status: 400 }
      );
    }

    const match = matchFaceDescriptors(storedDescriptor, liveDescriptor, FACE_MATCH_THRESHOLD);
    const distance = match.distance;
    const isVerified = match.isMatch;
    const faceMatchScore = match.score;

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    // Persist the attempt (audit trail: successes AND failures)
    const { data: verification, error: verifyError } = await supabase
      .from('timesheet_entry_verifications')
      .insert({
        entry_id: null, // linked after the punch entry is created
        employee_id,
        verification_method: 'facial_recognition',
        face_match_score: faceMatchScore,
        gps_latitude: typeof gps_latitude === 'number' ? gps_latitude : null,
        gps_longitude: typeof gps_longitude === 'number' ? gps_longitude : null,
        device_info: {
          ...(device_info && typeof device_info === 'object' ? device_info : {}),
          ip: ipAddress,
          user_agent: userAgent,
        },
        is_verified: isVerified,
        verification_notes: isVerified
          ? null
          : `distance ${distance.toFixed(4)} >= threshold ${FACE_MATCH_THRESHOLD}`,
      })
      .select('id')
      .single();

    if (verifyError || !verification) {
      console.error('Error creating verification record:', verifyError);
      return NextResponse.json({ error: 'Failed to create verification record' }, { status: 500 });
    }

    if (isVerified) {
      await supabase
        .from('employee_face_data')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', storedFace.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        verification_id: verification.id,
        is_verified: isVerified,
        face_match_score: faceMatchScore,
        distance,
        threshold: FACE_MATCH_THRESHOLD,
      },
      verification_id: verification.id,
      is_verified: isVerified,
      face_match_score: faceMatchScore,
      distance,
      threshold: FACE_MATCH_THRESHOLD,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('Error in face verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
