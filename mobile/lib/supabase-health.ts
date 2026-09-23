/**
 * Supabase Connection Health Checker
 * 
 * Provides utilities to verify Supabase connectivity, database schema,
 * and authentication status. Useful for debugging and troubleshooting.
 * 
 * Usage:
 *   import { supabaseHealth } from '@/lib/supabase-health';
 *   
 *   // Check all health aspects
 *   const health = await supabaseHealth.checkAll();
 *   
 *   // Check specific aspects
 *   const auth = await supabaseHealth.checkAuth();
 *   const db = await supabaseHealth.checkDatabase();
 *   const api = await supabaseHealth.checkAPI();
 */

import { supabase } from './supabase';
import { Platform } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';

// ============================================
// Types
// ============================================

/**
 * Health check result for a single component
 */
export type HealthCheckResult = {
  /** Component name */
  component: string;
  /** Status: healthy, warning, error, unknown */
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  /** Detailed message */
  message: string;
  /** Additional details */
  details?: any;
  /** Timestamp of check */
  checkedAt: string;
  /** Response time in milliseconds */
  responseTime?: number;
};

/**
 * Overall health status
 */
export type SupabaseHealthStatus = {
  /** Overall status */
  status: 'healthy' | 'warning' | 'error';
  /** Individual check results */
  checks: HealthCheckResult[];
  /** Network status */
  network: {
    isConnected: boolean;
    type: NetInfoState['type'];
    isConnectedThroughCellular: boolean;
  };
  /** Environment configuration */
  environment: {
    supabaseUrl: string | null;
    hasAnonKey: boolean;
    platform: string;
  };
  /** Timestamp of check */
  checkedAt: string;
};

// ============================================
// Health Checker Class
// ============================================

export class SupabaseHealthChecker {
  private supabaseUrl: string | null = null;
  private hasAnonKey: boolean = false;

  constructor() {
    // Read environment config (without throwing)
    try {
      this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || null;
      this.hasAnonKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    } catch {
      // Config validation may have thrown
      this.supabaseUrl = null;
      this.hasAnonKey = false;
    }
  }

  /**
   * Check all health aspects and return comprehensive report
   */
  async checkAll(): Promise<SupabaseHealthStatus> {
    const checks: HealthCheckResult[] = [];
    
    // Network check
    const networkCheck = await this.checkNetwork();
    checks.push(networkCheck);
    
    // Environment check
    const envCheck = await this.checkEnvironment();
    checks.push(envCheck);
    
    // If no network, skip other checks
    if (!networkCheck.details?.isConnected) {
      return {
        status: 'error',
        checks,
        network: networkCheck.details || {
          isConnected: false,
          type: 'unknown',
          isConnectedThroughCellular: false,
        },
        environment: {
          supabaseUrl: this.supabaseUrl,
          hasAnonKey: this.hasAnonKey,
          platform: Platform.OS,
        },
        checkedAt: new Date().toISOString(),
      };
    }
    
    // Auth check
    const authCheck = await this.checkAuth();
    checks.push(authCheck);
    
    // Database check
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);
    
    // API check
    const apiCheck = await this.checkAPI();
    checks.push(apiCheck);
    
    // Determine overall status
    const hasErrors = checks.some(c => c.status === 'error');
    const hasWarnings = checks.some(c => c.status === 'warning');
    
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (hasErrors) {
      overallStatus = 'error';
    } else if (hasWarnings) {
      overallStatus = 'warning';
    }
    
    return {
      status: overallStatus,
      checks,
      network: networkCheck.details || {
        isConnected: false,
        type: 'unknown',
        isConnectedThroughCellular: false,
      },
      environment: {
        supabaseUrl: this.supabaseUrl,
        hasAnonKey: this.hasAnonKey,
        platform: Platform.OS,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check network connectivity
   */
  async checkNetwork(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const state = await NetInfo.fetch();
      const responseTime = Date.now() - startTime;
      
      const isConnected = !!state.isConnected;
      const status = isConnected ? 'healthy' : 'error';
      const message = isConnected 
        ? `Connected (${state.type})`
        : 'No internet connection';
      
      return {
        component: 'Network',
        status,
        message,
        details: {
          isConnected,
          type: state.type,
          isConnectedThroughCellular: state.isInternetReachable === false,
          responseTime,
        },
        checkedAt: new Date().toISOString(),
        responseTime,
      };
    } catch (error: any) {
      return {
        component: 'Network',
        status: 'error',
        message: `Network check failed: ${error.message}`,
        details: { error: error.message },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check environment configuration
   */
  async checkEnvironment(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const issues: string[] = [];
    
    if (!this.supabaseUrl) {
      issues.push('SUPABASE_URL not configured');
    } else if (!this.supabaseUrl.startsWith('https://')) {
      issues.push('SUPABASE_URL must start with https://');
    }
    
    if (!this.hasAnonKey) {
      issues.push('SUPABASE_ANON_KEY not configured');
    } else if (this.hasAnonKey && (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) < 10) {
      issues.push('SUPABASE_ANON_KEY appears invalid (too short)');
    }
    
    const status = issues.length > 0 ? 'error' : 'healthy';
    
    return {
      component: 'Environment',
      status,
      message: issues.length > 0 ? issues.join('; ') : 'Configuration valid',
      details: {
        supabaseUrl: this.supabaseUrl ? this.supabaseUrl.replace(/:\/\/.*:/, '://***:***@') : null,
        hasAnonKey: this.hasAnonKey,
        keyLength: this.hasAnonKey ? (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length || 0) : 0,
        platform: Platform.OS,
        issues,
      },
      checkedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Check authentication status
   */
  async checkAuth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          component: 'Auth',
          status: 'error',
          message: `Auth check failed: ${error.message}`,
          details: { error: error.message, responseTime },
          checkedAt: new Date().toISOString(),
          responseTime,
        };
      }
      
      const hasSession = !!data.session;
      const status = hasSession ? 'healthy' : 'warning';
      const message = hasSession 
        ? `Authenticated as ${data.session.user.email || 'user'}`
        : 'No active session (guest mode)';
      
      return {
        component: 'Auth',
        status,
        message,
        details: {
          hasSession,
          userId: data.session?.user?.id || null,
          email: data.session?.user?.email || null,
          expiresAt: data.session?.expires_at || null,
          responseTime,
        },
        checkedAt: new Date().toISOString(),
        responseTime,
      };
    } catch (error: any) {
      return {
        component: 'Auth',
        status: 'error',
        message: `Auth check error: ${error.message}`,
        details: { error: error.message },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check database connectivity and schema
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic query capability
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        // Check if table exists error
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return {
            component: 'Database',
            status: 'error',
            message: 'Table "profiles" does not exist - database migration may be needed',
            details: { error: error.message, responseTime },
            checkedAt: new Date().toISOString(),
            responseTime,
          };
        }
        
        return {
          component: 'Database',
          status: 'error',
          message: `Database query failed: ${error.message}`,
          details: { error: error.message, responseTime },
          checkedAt: new Date().toISOString(),
          responseTime,
        };
      }
      
      return {
        component: 'Database',
        status: 'healthy',
        message: 'Database accessible',
        details: {
          canRead: true,
          responseTime,
        },
        checkedAt: new Date().toISOString(),
        responseTime,
      };
    } catch (error: any) {
      return {
        component: 'Database',
        status: 'error',
        message: `Database check error: ${error.message}`,
        details: { error: error.message },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check API connectivity
   */
  async checkAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';
    
    try {
      // Try to reach the API health endpoint
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json().catch(() => null);
        return {
          component: 'API',
          status: 'healthy',
          message: 'API accessible',
          details: {
            url: apiUrl,
            statusCode: response.status,
            responseTime,
            health: data,
          },
          checkedAt: new Date().toISOString(),
          responseTime,
        };
      } else {
        return {
          component: 'API',
          status: 'warning',
          message: `API returned status ${response.status}`,
          details: {
            url: apiUrl,
            statusCode: response.status,
            responseTime,
          },
          checkedAt: new Date().toISOString(),
          responseTime,
        };
      }
    } catch (error: any) {
      return {
        component: 'API',
        status: 'error',
        message: `API connection failed: ${error.message}`,
        details: {
          url: apiUrl,
          error: error.message,
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate a debug report as JSON string
   */
  async generateDebugReport(): Promise<string> {
    const health = await this.checkAll();
    
    const report = {
      ...health,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version?.toString() || 'unknown',
      },
      timestamp: new Date().toISOString(),
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Copy debug report to clipboard (if available)
   */
  async copyDebugReport(): Promise<boolean> {
    try {
      const report = await this.generateDebugReport();
      
      // Try to use expo-clipboard if available
      // For now, just return the report
      console.log('Debug Report:', report);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const supabaseHealth = new SupabaseHealthChecker();

// ============================================
// Helper Hook for React Components
// ============================================

/**
 * Hook to monitor Supabase health in components
 */
export function useSupabaseHealth() {
  // This would normally use useState and useEffect
  // For simplicity, returning a placeholder
  return {
    health: null as SupabaseHealthStatus | null,
    check: async () => supabaseHealth.checkAll(),
    isLoading: false,
  };
}
