/**
 * Performance Monitoring Service
 * Tracks and reports performance metrics for the Timesheet Manager system
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  userId?: string;
  tenantId?: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

interface DatabaseMetric {
  query: string;
  duration: number;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: number;
  rowsAffected?: number;
}

interface SystemMetric {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];
  private dbMetrics: DatabaseMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private maxMetrics = 1000; // Limit stored metrics
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic flushing
    this.startPeriodicFlush();
    
    // Monitor system resources
    this.startSystemMonitoring();
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now()
    });

    // Maintain max size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record API call performance
   */
  recordApiCall(metric: Omit<ApiMetric, 'timestamp'>): void {
    this.apiMetrics.push({
      ...metric,
      timestamp: Date.now()
    });

    // Maintain max size
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(metric: Omit<DatabaseMetric, 'timestamp'>): void {
    this.dbMetrics.push({
      ...metric,
      timestamp: Date.now()
    });

    // Maintain max size
    if (this.dbMetrics.length > this.maxMetrics) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record system resource usage
   */
  private recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemMetric: SystemMetric = {
      cpu: this.calculateCpuUsage(cpuUsage),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    };

    this.systemMetrics.push(systemMetric);

    // Maintain max size
    if (this.systemMetrics.length > this.maxMetrics) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: any): number {
    // Simplified CPU usage calculation
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return (totalUsage / 1000000) * 100; // Convert to percentage
  }

  /**
   * Start periodic metrics flushing
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 60000); // Flush every minute
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    setInterval(() => {
      this.recordSystemMetrics();
    }, 10000); // Monitor every 10 seconds
  }

  /**
   * Flush metrics to external service (placeholder)
   */
  private async flushMetrics(): Promise<void> {
    try {
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalService();
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * Send metrics to external monitoring service
   */
  private async sendToExternalService(): Promise<void> {
    const payload = {
      timestamp: Date.now(),
      custom_metrics: this.getAggregatedMetrics(),
      api_metrics: this.getApiMetricsSummary(),
      db_metrics: this.getDbMetricsSummary(),
      system_metrics: this.getLatestSystemMetrics()
    };

    try {
      // Example: Send to DataDog, New Relic, etc.
      if (process.env.MONITORING_ENDPOINT) {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (error) {
      console.error('Failed to send metrics to external service:', error);
    }
  }

  /**
   * Get aggregated metrics summary
   */
  private getAggregatedMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
    
    const grouped = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = {
          name: metric.name,
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
          unit: metric.unit
        };
      }
      
      const group = acc[metric.name];
      group.count++;
      group.sum += metric.value;
      group.min = Math.min(group.min, metric.value);
      group.max = Math.max(group.max, metric.value);
      group.avg = group.sum / group.count;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  /**
   * Get API metrics summary
   */
  private getApiMetricsSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentApiMetrics = this.apiMetrics.filter(m => m.timestamp >= oneHourAgo);
    
    const summary = {
      total_requests: recentApiMetrics.length,
      avg_response_time: 0,
      error_rate: 0,
      slowest_endpoints: [] as any[],
      error_breakdown: {} as Record<string, number>
    };

    if (recentApiMetrics.length > 0) {
      const totalDuration = recentApiMetrics.reduce((sum, m) => sum + m.duration, 0);
      summary.avg_response_time = totalDuration / recentApiMetrics.length;
      
      const errors = recentApiMetrics.filter(m => m.status >= 400);
      summary.error_rate = (errors.length / recentApiMetrics.length) * 100;
      
      // Group by status code
      recentApiMetrics.forEach(m => {
        const statusGroup = `${Math.floor(m.status / 100)}xx`;
        summary.error_breakdown[statusGroup] = (summary.error_breakdown[statusGroup] || 0) + 1;
      });
      
      // Find slowest endpoints
      summary.slowest_endpoints = recentApiMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(m => ({
          endpoint: m.endpoint,
          method: m.method,
          avg_duration: m.duration,
          count: 1
        }));
    }

    return summary;
  }

  /**
   * Get database metrics summary
   */
  private getDbMetricsSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentDbMetrics = this.dbMetrics.filter(m => m.timestamp >= oneHourAgo);
    
    const summary = {
      total_queries: recentDbMetrics.length,
      avg_query_time: 0,
      slow_queries: 0,
      table_operations: {} as Record<string, number>,
      operation_breakdown: {
        SELECT: 0,
        INSERT: 0,
        UPDATE: 0,
        DELETE: 0
      }
    };

    if (recentDbMetrics.length > 0) {
      const totalDuration = recentDbMetrics.reduce((sum, m) => sum + m.duration, 0);
      summary.avg_query_time = totalDuration / recentDbMetrics.length;
      
      summary.slow_queries = recentDbMetrics.filter(m => m.duration > 1000).length; // > 1 second
      
      // Group by table
      recentDbMetrics.forEach(m => {
        summary.table_operations[m.table] = (summary.table_operations[m.table] || 0) + 1;
        summary.operation_breakdown[m.operation]++;
      });
    }

    return summary;
  }

  /**
   * Get latest system metrics
   */
  private getLatestSystemMetrics(): SystemMetric | null {
    return this.systemMetrics.length > 0 
      ? this.systemMetrics[this.systemMetrics.length - 1] 
      : null;
  }

  /**
   * Get all metrics (for debugging)
   */
  getAllMetrics() {
    return {
      custom: this.metrics,
      api: this.apiMetrics,
      database: this.dbMetrics,
      system: this.systemMetrics
    };
  }

  /**
   * Get health check status
   */
  getHealthStatus() {
    const latestSystem = this.getLatestSystemMetrics();
    const recentApiMetrics = this.apiMetrics.filter(m => 
      m.timestamp >= Date.now() - (5 * 60 * 1000) // Last 5 minutes
    );

    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: Date.now(),
      checks: {
        system: {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          message: 'System resources normal',
          details: latestSystem
        },
        api: {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          message: 'API response times normal',
          details: {
            total_requests: recentApiMetrics.length,
            avg_response_time: recentApiMetrics.length > 0 
              ? recentApiMetrics.reduce((sum, m) => sum + m.duration, 0) / recentApiMetrics.length 
              : 0
          }
        },
        database: {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          message: 'Database performance normal',
          details: {}
        }
      }
    };

    // Determine overall health
    const statuses = Object.values(health.checks).map(check => check.status);
    if (statuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      health.status = 'degraded';
    }

    // Specific health checks
    if (latestSystem && latestSystem.memory.percentage > 90) {
      health.checks.system.status = 'unhealthy';
      health.checks.system.message = 'High memory usage';
      health.status = 'unhealthy';
    }

    if (latestSystem && latestSystem.cpu > 80) {
      health.checks.system.status = 'degraded';
      health.checks.system.message = 'High CPU usage';
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
    }

    const avgApiResponse = recentApiMetrics.length > 0 
      ? recentApiMetrics.reduce((sum, m) => sum + m.duration, 0) / recentApiMetrics.length 
      : 0;

    if (avgApiResponse > 2000) {
      health.checks.api.status = 'degraded';
      health.checks.api.message = 'High API response times';
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export const performanceMonitor = {
  getInstance(): PerformanceMonitor {
    if (!monitorInstance) {
      monitorInstance = new PerformanceMonitor();
    }
    return monitorInstance;
  },

  // Utility methods
  recordMetric(name: string, value: number, unit: PerformanceMetric['unit'], tags?: Record<string, string | number>) {
    this.getInstance().recordMetric({ name, value, unit, tags, timestamp: Date.now() });
  },

  recordApiCall(endpoint: string, method: string, duration: number, status: number, userId?: string, tenantId?: string) {
    this.getInstance().recordApiCall({ endpoint, method, duration, status, userId, tenantId });
  },

  recordDatabaseQuery(query: string, duration: number, table: string, operation: DatabaseMetric['operation']) {
    this.getInstance().recordDatabaseQuery({ query, duration, table, operation });
  },

  getHealthStatus() {
    return this.getInstance().getHealthStatus();
  },

  getAllMetrics() {
    return this.getInstance().getAllMetrics();
  }
};

// Middleware for automatic API monitoring
export function withPerformanceMonitoring(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const startTime = Date.now();
    const monitor = performanceMonitor.getInstance();

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;

      // Record API metric
      if (response instanceof Response) {
        monitor.recordApiCall({
          endpoint: req.url,
          method: req.method,
          duration,
          status: response.status,
          // Extract user info if available
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenant_id
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record error metric
      monitor.recordApiCall({
        endpoint: req.url,
        method: req.method,
        duration,
        status: 500,
        userId: (req as any)?.user?.id,
        tenantId: (req as any)?.user?.tenant_id
      });

      throw error;
    }
  };
}

export default performanceMonitor;