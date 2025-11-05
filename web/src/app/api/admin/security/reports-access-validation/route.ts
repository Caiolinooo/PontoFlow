import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { runAccessControlValidation, generateSecurityReport } from '@/lib/access-control-validation';

// POST /api/admin/security/reports-access-validation - Run validation tests
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    
    console.log('[SECURITY-VALIDATION] Admin user initiated access control validation:', user.id);

    // Run all access control validation tests
    const validationResults = await runAccessControlValidation();
    
    // Generate security report
    const securityReport = generateSecurityReport(validationResults);

    console.log('[SECURITY-VALIDATION] Validation completed:', {
      total: validationResults.total,
      passed: validationResults.passed,
      failed: validationResults.failed
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: validationResults.total,
        passed: validationResults.passed,
        failed: validationResults.failed,
        successRate: Math.round((validationResults.passed / validationResults.total) * 100)
      },
      results: validationResults.results.map(test => ({
        name: test.name,
        description: test.description,
        passed: test.result.passed,
        error: test.result.error,
        details: test.result.details
      })),
      securityReport
    });

  } catch (err) {
    console.error('[SECURITY-VALIDATION] Validation failed:', err);
    
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/admin/security/reports-access-validation - Get validation status/info
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    
    return NextResponse.json({
      status: 'available',
      message: 'Reports access control validation endpoint',
      methods: {
        POST: 'Run full validation tests',
        GET: 'This information endpoint'
      },
      securityFeatures: [
        'Hierarchical permission model',
        'Parameter validation and sanitization', 
        'Access control middleware',
        'Audit logging',
        'Frontend security restrictions'
      ],
      lastChecked: null // Could track last validation time
    });

  } catch (err) {
    console.error('[SECURITY-VALIDATION] Info request failed:', err);
    
    return NextResponse.json({
      error: 'Authentication required'
    }, { status: 401 });
  }
}