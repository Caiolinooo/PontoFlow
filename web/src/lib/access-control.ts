'use strict';

/**
 * Reports Access Control Utility
 * Implements hierarchical permissions for reports and employee data access
 */

import { getServiceSupabase } from '@/lib/supabase/server';

export interface AccessControlResult {
  allowed: boolean;
  error?: string;
  employeeId?: string;
  allowedEmployeeIds?: string[];
}

export interface AuditLogEntry {
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  employeeId?: string;
  scope: string;
  success: boolean;
  details?: Record<string, any>;
}

/**
 * Get manager's scope of managed employees based on their groups
 */
export async function getManagerScope(userId: string, tenantId: string): Promise<string[]> {
  const supabase = getServiceSupabase();

  // Get groups managed by this manager
  const { data: managerGroups, error: managerGroupsError } = await supabase
    .from('manager_group_assignments')
    .select('group_id')
    .eq('tenant_id', tenantId)
    .eq('manager_id', userId);

  if (managerGroupsError) {
    console.error('[ACCESS-CONTROL] Error fetching manager groups:', managerGroupsError);
    return [];
  }

  const groupIds = (managerGroups || []).map(g => g.group_id);

  if (groupIds.length === 0) {
    console.log('[ACCESS-CONTROL] Manager has no assigned groups');
    return [];
  }

  // Get employees in those groups
  const { data: groupMembers, error: groupMembersError } = await supabase
    .from('employee_group_members')
    .select('employee_id')
    .eq('tenant_id', tenantId)
    .in('group_id', groupIds);

  if (groupMembersError) {
    console.error('[ACCESS-CONTROL] Error fetching group members:', groupMembersError);
    return [];
  }

  const allowedEmployeeIds = [...new Set((groupMembers || []).map(m => m.employee_id))];

  console.log('[ACCESS-CONTROL] Manager scope:', {
    managerId: userId,
    groupIds,
    employeeCount: allowedEmployeeIds.length
  });

  return allowedEmployeeIds;
}

/**
 * Check if manager has access to specific employee
 */
export async function managerHasAccessToEmployee(
  managerId: string,
  tenantId: string,
  targetEmployeeId: string
): Promise<boolean> {
  const allowedEmployeeIds = await getManagerScope(managerId, tenantId);
  return allowedEmployeeIds.includes(targetEmployeeId);
}

/**
 * Validate reports access based on user role and parameters
 */
export async function validateReportsAccess(
  userId: string,
  userRole: string,
  tenantId: string,
  requestedEmployeeId?: string,
  reportScope?: string
): Promise<AccessControlResult> {
  const supabase = getServiceSupabase();

  try {
    // For regular users, only allow their own data
    if (userRole === 'USER') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('user_id', userId)
        .single();

      if (!profile?.employee_id) {
        return {
          allowed: false,
          error: 'Colaborador não encontrado'
        };
      }

      // If requesting specific employee, must be themselves
      if (requestedEmployeeId && requestedEmployeeId !== profile.employee_id) {
        return {
          allowed: false,
          error: 'Acesso negado a dados de outros colaboradores'
        };
      }

      return {
        allowed: true,
        employeeId: profile.employee_id
      };
    }

    // For managers, check scope
    if (userRole === 'MANAGER' || userRole === 'MANAGER_TIMESHEET') {
      const allowedEmployeeIds = await getManagerScope(userId, tenantId);

      if (allowedEmployeeIds.length === 0) {
        // Manager has no groups - like a regular user
        const { data: profile } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('user_id', userId)
          .single();

        if (!profile?.employee_id) {
          return {
            allowed: false,
            error: 'Perfil de colaborador não encontrado'
          };
        }

        return {
          allowed: true,
          employeeId: profile.employee_id
        };
      }

      // Check if requesting specific employee
      if (requestedEmployeeId) {
        const hasAccess = await managerHasAccessToEmployee(userId, tenantId, requestedEmployeeId);
        if (!hasAccess) {
          return {
            allowed: false,
            error: 'Acesso negado a este colaborador'
          };
        }
        return {
          allowed: true,
          employeeId: requestedEmployeeId
        };
      }

      return {
        allowed: true,
        allowedEmployeeIds
      };
    }

    // Admins have access to everything
    if (userRole === 'ADMIN' || userRole === 'TENANT_ADMIN') {
      return {
        allowed: true,
        employeeId: requestedEmployeeId
      };
    }

    return {
      allowed: false,
      error: 'Role não autorizado para relatórios'
    };
  } catch (err) {
    console.error('[ACCESS-CONTROL] Error validating access:', err);
    return {
      allowed: false,
      error: 'Erro interno ao validar permissões'
    };
  }
}

/**
 * Log access control events for audit
 */
export async function logAccessControl(event: AuditLogEntry): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    
    // Store audit log (you may want to create an audit_logs table)
    // For now, we'll use console.log but this should be replaced with proper database logging
    console.log('[AUDIT-LOG]', {
      timestamp: new Date().toISOString(),
      ...event
    });

    // TODO: Add proper database logging when audit_logs table is created
    // await supabase.from('audit_logs').insert([event]);
  } catch (err) {
    console.error('[AUDIT-LOG] Error logging access control event:', err);
  }
}

/**
 * Validate and sanitize report parameters
 */
export function validateReportParameters(params: {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
  type?: string;
  scope?: string;
  format?: string;
}): { valid: boolean; error?: string; sanitized: Record<string, any> } {
  const sanitized: Record<string, any> = {};
  const errors: string[] = [];

  // Helper function to validate and sanitize a field
  const validateAndSanitize = (value: any, validator: (val: string) => boolean, fieldName: string) => {
    if (value === undefined || value === null || value === '') {
      return undefined; // No filter applied
    }
    if (typeof value === 'string' && validator(value)) {
      return value;
    }
    errors.push(`${fieldName} inválido`);
    return undefined;
  };

  // Validate date formats (YYYY-MM-DD)
  const dateValidator = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  sanitized.startDate = validateAndSanitize(params.startDate, dateValidator, 'Data de início');
  sanitized.endDate = validateAndSanitize(params.endDate, dateValidator, 'Data de fim');

  // Validate status values
  const validStatuses = ['rascunho', 'enviado', 'aprovado', 'recusado', 'bloqueado', 'draft', 'submitted', 'approved', 'rejected', 'locked'];
  const statusValidator = (status: string) => validStatuses.includes(status);
  sanitized.status = validateAndSanitize(params.status, statusValidator, 'Status');

  // Validate employeeId (UUID format)
  const uuidValidator = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  sanitized.employeeId = validateAndSanitize(params.employeeId, uuidValidator, 'ID de colaborador');

  // Validate report type
  const validTypes = ['summary', 'detailed'];
  const typeValidator = (type: string) => validTypes.includes(type);
  sanitized.type = validateAndSanitize(params.type, typeValidator, 'Tipo de relatório');

  // Validate report scope - expanded to support more filter options
  const validScopes = ['timesheets', 'pending', 'approved', 'rejected', 'by-employee', 'by-vessel'];
  const scopeValidator = (scope: string) => validScopes.includes(scope);
  sanitized.scope = validateAndSanitize(params.scope, scopeValidator, 'Escopo de relatório');

  // Validate export format
  const validFormats = ['csv', 'json', 'pdf', 'excel'];
  const formatValidator = (format: string) => validFormats.includes(format);
  sanitized.format = validateAndSanitize(params.format, formatValidator, 'Formato de exportação');

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      sanitized: {}
    };
  }

  return {
    valid: true,
    sanitized
  };
}