import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

// Same threshold as the client (lib/face-recognition.ts): face-api recommends 0.6,
// this product uses 0.5 (stricter) for punch verification.
const FACE_MATCH_THRESHOLD = 0.5;
const DESCRIPTOR_LENGTH = 128;

function parseDescriptor(raw: unknown): number[] | null {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(value) || value.length !== DESCRIPTOR_LENGTH) return null;
  return value.every((n) => typeof n === 'number' && Number.isFinite(n)) ? value : null;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

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

    let storedDescriptor: number[] | null = null;
    let liveDescriptor: number[] | null = null;
    try {
      storedDescriptor = parseDescriptor(storedFace.face_encoding);
      liveDescriptor = parseDescriptor(face_encoding);
    } catch {
      // fall through to validation error
    }

    if (!storedDescriptor || !liveDescriptor) {
      return NextResponse.json(
        { error: 'invalid_face_encoding', details: `expected ${DESCRIPTOR_LENGTH}-d numeric descriptor` },
        { status: 400 }
      );
    }

    // Real comparison (euclidean distance on 128-d descriptors)
    const distance = euclideanDistance(storedDescriptor, liveDescriptor);
    const isVerified = distance < FACE_MATCH_THRESHOLD;
    const faceMatchScore = Math.max(0, 1 - distance);

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
