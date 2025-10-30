import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InAppNotificationData {
  user_id: string;
  type: string;
  event: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  expires_at?: string;
}

export async function createInAppNotification(notification: InAppNotificationData) {
  try {
    // Use our API route to create the notification
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });

    if (response.ok) {
      const result = await response.json();
      return result.notification;
    } else {
      console.warn('Failed to create in-app notification:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error);
    return null;
  }
}

// Enhanced notification dispatcher that includes both email and in-app notifications
export async function dispatchEnhancedNotification(event: {
  type: 'timesheet_rejected' | 'timesheet_approved' | 'timesheet_submitted' | 'deadline_reminder' | 'manager_pending_reminder' | 'timesheet_adjusted';
  to: string;
  user_id: string;
  payload: any;
}) {
  try {
    // Import the existing email dispatcher
    const { dispatchNotification } = await import('./dispatcher');
    
    // Send email notification (existing functionality)
    await dispatchNotification(event);

    // Also create in-app notification
    const inAppNotification = await createInAppNotification({
      user_id: event.user_id,
      type: 'in_app',
      event: event.type,
      title: getNotificationTitle(event.type, event.payload),
      message: getNotificationMessage(event.type, event.payload),
      data: event.payload
    });

    return inAppNotification;
  } catch (error) {
    console.error('Error dispatching enhanced notification:', error);
    return null;
  }
}

function getNotificationTitle(type: string, payload: any): string {
  const titles = {
    'timesheet_rejected': 'Timesheet Rejected',
    'timesheet_approved': 'Timesheet Approved',
    'timesheet_submitted': 'Timesheet Submitted',
    'deadline_reminder': 'Deadline Reminder',
    'manager_pending_reminder': 'Pending Timesheets',
    'timesheet_adjusted': 'Timesheet Adjusted'
  };
  return titles[type as keyof typeof titles] || 'New Notification';
}

function getNotificationMessage(type: string, payload: any): string {
  switch (type) {
    case 'timesheet_rejected':
      return `Your timesheet for ${payload.period} was rejected by ${payload.managerName}`;
    case 'timesheet_approved':
      return `Your timesheet for ${payload.period} was approved by ${payload.managerName}`;
    case 'timesheet_submitted':
      return `Your timesheet for ${payload.period} has been submitted`;
    case 'deadline_reminder':
      return `Reminder: ${payload.periodLabel} deadline is in ${payload.daysLeft} days`;
    case 'manager_pending_reminder':
      return `You have ${payload.employees?.length || 0} pending timesheets to review`;
    case 'timesheet_adjusted':
      return `Your timesheet for ${payload.period} was adjusted by ${payload.managerName}`;
    default:
      return 'You have a new notification';
  }
}

// Webhook-style function to integrate with existing API endpoints
export async function notifyTimesheetEvent(eventType: string, userId: string, payload: any) {
  const eventMap: Record<string, any> = {
    'timesheet_rejected': {
      type: 'timesheet_rejected',
      user_id: userId,
      payload: {
        ...payload,
        period: payload.period || 'current period'
      }
    },
    'timesheet_approved': {
      type: 'timesheet_approved', 
      user_id: userId,
      payload: {
        ...payload,
        period: payload.period || 'current period'
      }
    },
    'timesheet_submitted': {
      type: 'timesheet_submitted',
      user_id: userId,
      payload: {
        ...payload,
        period: payload.period || 'current period'
      }
    }
  };

  const event = eventMap[eventType];
  if (event) {
    return await dispatchEnhancedNotification({
      ...event,
      to: payload.email || 'unknown@email.com'
    });
  }

  return null;
}