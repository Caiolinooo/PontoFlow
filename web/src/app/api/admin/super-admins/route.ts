/**
 * Super Admins Management API
 *
 * SECURITY: These endpoints are ONLY accessible to super admins
 * Regular admins, managers, and users receive 404 (not 403) to hide existence
 *
 * Endpoints:
 * - GET:    List all super admins
 * - POST:   Add new super admin
 * - DELETE: Remove super admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth/server';
import {
  isSuperAdmin,
  listSuperAdmins,
  addSuperAdmin,
  removeSuperAdmin
} from '@/lib/auth/super-admin';
import { z } from 'zod';

/**
 * Middleware: Check if user is super admin
 * Returns 404 (not 403) to hide existence from non-super-admins
 */
async function requireSuperAdmin(req: NextRequest) {
  const user = await getApiUser();

  if (!user || user.role !== 'ADMIN') {
    // Return 404 to hide existence
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isSuper = await isSuperAdmin(user.email);
  if (!isSuper) {
    // Return 404 to hide existence (not 403)
    console.warn(`[super-admins] Non-super admin ${user.email} attempted access`);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return { user, isSuper: true };
}

/**
 * GET /api/admin/super-admins
 * List all super admins
 *
 * Response:
 * {
 *   super_admins: [
 *     { id, email, created_at, created_by, notes },
 *     ...
 *   ],
 *   system_owner: "Caio...", // Always shown (hardcoded)
 *   total: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { user } = authCheck;
    const superAdmins = await listSuperAdmins();

    return NextResponse.json({
      super_admins: superAdmins,
      system_owner: 'System Owner (Permanent)', // Don't expose actual email in API
      total: superAdmins.length + 1, // +1 for system owner
      requested_by: user.email
    });
  } catch (error) {
    console.error('[super-admins] GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/super-admins
 * Add new super admin
 *
 * Body:
 * {
 *   email: string (required),
 *   notes?: string (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   id?: string,
 *   error?: string
 * }
 */
const AddSuperAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  notes: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { user } = authCheck;

    const body = await req.json().catch(() => ({}));
    const parsed = AddSuperAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 });
    }

    const result = await addSuperAdmin(
      parsed.data.email,
      user.email,
      parsed.data.notes
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    console.log(`[super-admins] ${user.email} added super admin: ${parsed.data.email}`);

    return NextResponse.json({
      success: true,
      id: result.id,
      message: `Super admin ${parsed.data.email} added successfully`
    });
  } catch (error) {
    console.error('[super-admins] POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/super-admins
 * Remove super admin
 *
 * Body:
 * {
 *   id: string (UUID of super admin to remove)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   error?: string
 * }
 */
const RemoveSuperAdminSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { user } = authCheck;

    const body = await req.json().catch(() => ({}));
    const parsed = RemoveSuperAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 });
    }

    const result = await removeSuperAdmin(parsed.data.id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    console.log(`[super-admins] ${user.email} removed super admin: ${parsed.data.id}`);

    return NextResponse.json({
      success: true,
      message: 'Super admin removed successfully'
    });
  } catch (error) {
    console.error('[super-admins] DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 500 });
  }
}
