/**
 * Advanced Analytics Tracker
 * 
 * Tracks user behavior and system metrics:
 * - Page views
 * - User actions (timesheet submit, approve, reject)
 * - Performance metrics
 * - Error tracking
 * - Custom events
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  user_id?: string;
  tenant_id?: string;
}

export interface PageViewEvent {
  path: string;
  title: string;
  referrer?: string;
  duration?: number;
}

export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Analytics tracker class
 */
export class AnalyticsTracker {
  private userId?: string;
  private tenantId?: string;
  private sessionId: string;
  private pageStartTime: number = Date.now();
  private enabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
  }

  /**
   * Initialize tracker with user context
   */
  init(userId: string, tenantId: string): void {
    this.userId = userId;
    this.tenantId = tenantId;
  }

  /**
   * Track page view
   */
  trackPageView(event: PageViewEvent): void {
    if (!this.enabled) return;

    this.track('page_view', {
      ...event,
      session_id: this.sessionId,
    });

    this.pageStartTime = Date.now();
  }

  /**
   * Track custom event
   */
  track(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        session_id: this.sessionId,
      },
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      tenant_id: this.tenantId,
    };

    // Send to analytics endpoint
    this.sendEvent(event);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event);
    }
  }

  /**
   * Track timesheet action
   */
  trackTimesheetAction(action: 'create' | 'submit' | 'approve' | 'reject', timesheetId: string): void {
    this.track(`timesheet_${action}`, {
      timesheet_id: timesheetId,
    });
  }

  /**
   * Track export action
   */
  trackExport(format: 'json' | 'csv' | 'pdf', type: 'timesheet' | 'invoice' | 'report'): void {
    this.track('export', {
      format,
      type,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    this.track('performance', metrics as Record<string, unknown>);
  }

  /**
   * Track user timing
   */
  trackTiming(category: string, variable: string, value: number): void {
    this.track('timing', {
      category,
      variable,
      value,
    });
  }

  /**
   * Send event to analytics endpoint
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.error('[Analytics] Failed to send event:', err);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get page duration
   */
  getPageDuration(): number {
    return Date.now() - this.pageStartTime;
  }
}

// Singleton instance
let tracker: AnalyticsTracker | null = null;

/**
 * Get analytics tracker instance
 */
export function getAnalyticsTracker(): AnalyticsTracker {
  if (!tracker) {
    tracker = new AnalyticsTracker();
  }
  return tracker;
}

/**
 * Track page view (convenience function)
 */
export function trackPageView(path: string, title: string): void {
  getAnalyticsTracker().trackPageView({ path, title });
}

/**
 * Track event (convenience function)
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  getAnalyticsTracker().track(name, properties);
}

/**
 * Track error (convenience function)
 */
export function trackError(error: Error, context?: Record<string, unknown>): void {
  getAnalyticsTracker().trackError(error, context);
}

/**
 * Collect Web Vitals
 */
export function collectWebVitals(): void {
  if (typeof window === 'undefined') return;

  // LCP - Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
    const lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
    getAnalyticsTracker().trackPerformance({ lcp });
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // FID - First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      const fidEntry = entry as PerformanceEntry & { processingStart?: number };
      const fid = fidEntry.processingStart ? fidEntry.processingStart - entry.startTime : 0;
      getAnalyticsTracker().trackPerformance({ fid });
    });
  }).observe({ entryTypes: ['first-input'] });

  // CLS - Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
      if (!clsEntry.hadRecentInput) {
        clsValue += clsEntry.value || 0;
      }
    });
    getAnalyticsTracker().trackPerformance({ cls: clsValue });
  }).observe({ entryTypes: ['layout-shift'] });

  // TTFB - Time to First Byte
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigationEntry) {
    const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
    getAnalyticsTracker().trackPerformance({ ttfb });
  }
}

