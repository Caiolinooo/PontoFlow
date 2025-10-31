import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';

/**
 * Basic import (dry-run) validator. Accepts JSON with shape:
 * { data: { timesheets: [], entries: [], approvals: [] } }
 * Returns counts; no DB writes (safe).
 */
export async function POST(req: NextRequest) {
  await requireApiRole(['ADMIN']);
  try {
    const body = await req.json();
    const data = body?.data || {};
    const timesheets = Array.isArray(data.timesheets) ? data.timesheets : [];
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const approvals = Array.isArray(data.approvals) ? data.approvals : [];
    return NextResponse.json({ ok: true, counts: { timesheets: timesheets.length, entries: entries.length, approvals: approvals.length } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'invalid_json' }, { status: 400 });
  }
}

