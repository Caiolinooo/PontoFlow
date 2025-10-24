# Advanced Analytics

## Overview

The Timesheet Manager includes comprehensive analytics tracking to monitor user behavior, system performance, and business metrics.

## Features

- **Page view tracking**
- **User action tracking**
- **Performance monitoring** (Web Vitals)
- **Error tracking**
- **Custom events**
- **Session tracking**
- **Multi-tenant analytics**

## Architecture

```
┌─────────────┐
│   Browser   │
│   Client    │
└──────┬──────┘
       │ Track Events
       ▼
┌─────────────┐
│  Analytics  │
│   Tracker   │
└──────┬──────┘
       │ Send to API
       ▼
┌─────────────┐
│  Analytics  │
│     API     │
└──────┬──────┘
       │ Store
       ▼
┌─────────────┐
│  Supabase   │
│  (Database) │
└─────────────┘
```

## Event Types

### Page Views
```typescript
trackPageView('/dashboard', 'Dashboard');
```

### User Actions
```typescript
// Timesheet actions
trackTimesheetAction('create', 'ts-123');
trackTimesheetAction('submit', 'ts-123');
trackTimesheetAction('approve', 'ts-123');
trackTimesheetAction('reject', 'ts-123');

// Export actions
trackExport('pdf', 'invoice');
trackExport('csv', 'report');
```

### Custom Events
```typescript
trackEvent('button_click', {
  button_id: 'submit-timesheet',
  page: '/employee/timesheets/123',
});

trackEvent('search', {
  query: 'john doe',
  results_count: 5,
});
```

### Errors
```typescript
try {
  // Some code
} catch (error) {
  trackError(error, {
    component: 'TimesheetEditor',
    action: 'save',
  });
}
```

### Performance
```typescript
// Automatically collected Web Vitals
collectWebVitals();

// Manual timing
const start = Date.now();
// ... operation ...
const duration = Date.now() - start;
trackTiming('api', 'fetch_timesheets', duration);
```

## Usage

### Initialize Tracker

```typescript
import { getAnalyticsTracker } from '@/lib/analytics/tracker';

// Initialize with user context
const tracker = getAnalyticsTracker();
tracker.init(userId, tenantId);
```

### Track Page Views

```typescript
import { trackPageView } from '@/lib/analytics/tracker';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function Layout({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname, document.title);
  }, [pathname]);

  return <div>{children}</div>;
}
```

### Track User Actions

```typescript
import { trackEvent } from '@/lib/analytics/tracker';

function SubmitButton({ timesheetId }) {
  const handleSubmit = async () => {
    // Submit timesheet
    await submitTimesheet(timesheetId);
    
    // Track action
    trackEvent('timesheet_submit', {
      timesheet_id: timesheetId,
    });
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Track Errors

```typescript
import { trackError } from '@/lib/analytics/tracker';

function ErrorBoundary({ children }) {
  const handleError = (error: Error) => {
    trackError(error, {
      boundary: 'root',
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
```

### Collect Web Vitals

```typescript
import { collectWebVitals } from '@/lib/analytics/tracker';

// In _app.tsx or layout.tsx
useEffect(() => {
  collectWebVitals();
}, []);
```

## Configuration

### Environment Variables

```env
# Enable/disable analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Analytics endpoint (optional, defaults to /api/analytics/track)
NEXT_PUBLIC_ANALYTICS_ENDPOINT=/api/analytics/track
```

### Database Schema

```sql
-- Analytics events table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_analytics_tenant (tenant_id),
  INDEX idx_analytics_user (user_id),
  INDEX idx_analytics_event (event_name),
  INDEX idx_analytics_timestamp (timestamp)
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.tenant_id = analytics_events.tenant_id
    )
  );
```

## API Endpoint

```typescript
// app/api/analytics/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = await req.json();

  // Insert event
  const { error } = await supabase
    .from('analytics_events')
    .insert({
      tenant_id: event.tenant_id,
      user_id: event.user_id,
      session_id: event.properties.session_id,
      event_name: event.name,
      properties: event.properties,
      timestamp: event.timestamp,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

## Metrics & Reports

### Key Metrics

1. **User Engagement**
   - Daily/Monthly Active Users (DAU/MAU)
   - Session duration
   - Pages per session
   - Bounce rate

2. **Timesheet Metrics**
   - Timesheets created per day
   - Submission rate
   - Approval rate
   - Average approval time

3. **Performance Metrics**
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - TTFB (Time to First Byte)

4. **Error Metrics**
   - Error rate
   - Error types
   - Affected users
   - Error trends

### Sample Queries

```sql
-- Daily active users
SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE tenant_id = 'your-tenant-id'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Most popular pages
SELECT properties->>'path' as page, COUNT(*) as views
FROM analytics_events
WHERE tenant_id = 'your-tenant-id'
  AND event_name = 'page_view'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY page
ORDER BY views DESC
LIMIT 10;

-- Average approval time
SELECT AVG(
  EXTRACT(EPOCH FROM (approved_at - submitted_at)) / 3600
) as avg_hours
FROM timesheets
WHERE tenant_id = 'your-tenant-id'
  AND status = 'approved'
  AND submitted_at >= NOW() - INTERVAL '30 days';

-- Error rate
SELECT 
  DATE(timestamp) as date,
  COUNT(*) FILTER (WHERE event_name = 'error') as errors,
  COUNT(*) as total_events,
  (COUNT(*) FILTER (WHERE event_name = 'error')::FLOAT / COUNT(*)) * 100 as error_rate
FROM analytics_events
WHERE tenant_id = 'your-tenant-id'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date;
```

## Dashboards

### Admin Dashboard

Display key metrics:
- Total users
- Active users (today/week/month)
- Timesheets submitted (today/week/month)
- Average approval time
- System health (error rate, performance)

### Manager Dashboard

Display team metrics:
- Pending approvals
- Team productivity
- Submission trends
- Approval trends

## Privacy & Compliance

### GDPR Compliance
- User consent required
- Data anonymization options
- Right to deletion
- Data export capability

### Data Retention
- Events retained for 90 days by default
- Configurable retention period
- Automatic cleanup of old data

### PII Handling
- No sensitive data in events
- User IDs hashed
- IP addresses anonymized

## Best Practices

1. **Track meaningful events** - Focus on business-critical actions
2. **Keep properties minimal** - Only include necessary data
3. **Avoid PII** - Never track passwords, emails, etc.
4. **Batch events** - Send multiple events together when possible
5. **Handle errors gracefully** - Don't break app if tracking fails
6. **Test in development** - Verify events before production

## Troubleshooting

### Events Not Appearing
- Check `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
- Verify API endpoint is correct
- Check browser console for errors
- Verify database permissions

### Performance Issues
- Batch events instead of sending individually
- Use async tracking (don't block UI)
- Implement sampling for high-volume events
- Add indexes to database

## Future Enhancements

- [ ] Real-time dashboard
- [ ] Funnel analysis
- [ ] Cohort analysis
- [ ] A/B testing framework
- [ ] Predictive analytics
- [ ] Custom report builder

