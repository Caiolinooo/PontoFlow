import {sendEmail} from './email-service';
import {timesheetRejectedEmail} from './templates/timesheet-rejected';
import {timesheetApprovedEmail} from './templates/timesheet-approved';
import {deadlineReminderEmail} from './templates/deadline-reminder';
import {managerPendingReminderEmail} from './templates/manager-pending-reminder';
import {timesheetSubmittedEmail} from './templates/timesheet-submitted';
import {timesheetAdjustedEmail} from './templates/timesheet-adjusted';
import { getTenantBranding } from './email-context';

type Locale = 'pt-BR' | 'en-GB';

type Event =
  | {type: 'timesheet_rejected'; to: string; payload: {employeeName: string; managerName: string; period: string; reason: string; annotations: Array<{field?: string; message: string}>; url: string; locale: Locale; tenantId?: string}}
  | {type: 'timesheet_approved'; to: string; payload: {employeeName: string; managerName: string; period: string; url: string; locale: Locale; tenantId?: string}}
  | {type: 'timesheet_submitted'; to: string; payload: {employeeName: string; period: string; url: string; locale: Locale; tenantId?: string}}
  | {type: 'deadline_reminder'; to: string; payload: {name: string; periodLabel: string; daysLeft: number; url: string; locale: Locale}}
  | {type: 'manager_pending_reminder'; to: string; payload: {managerName: string; periodLabel: string; employees: Array<{name: string}>; locale: Locale}}
  | {type: 'timesheet_adjusted'; to: string; payload: {employeeName: string; managerName: string; period: string; justification: string; url: string; locale: Locale; tenantId?: string}};

export async function dispatchNotification(event: Event) {
  switch (event.type) {
    case 'timesheet_rejected': {
      let companyName: string | undefined;
      let logoUrl: string | undefined;
      const anyPayload: any = (event as any).payload;
      try {
        if (anyPayload?.tenantId) {
          const branding = await getTenantBranding(anyPayload.tenantId);
          companyName = branding.companyNameOverride || branding.tenantName;
          logoUrl = branding.logoUrl;
        }
      } catch {}
      const {subject, html} = timesheetRejectedEmail({
        employeeName: event.payload.employeeName,
        managerName: event.payload.managerName,
        period: event.payload.period,
        reason: event.payload.reason,
        annotations: event.payload.annotations,
        timesheetUrl: event.payload.url,
        locale: event.payload.locale,
        branding: { companyName, logoUrl }
      });
      await sendEmail({to: event.to, subject, html, tenantId: event.payload.tenantId});
      return { subject, html };
    }
    case 'timesheet_approved': {
      let companyName: string | undefined;
      let logoUrl: string | undefined;
      const anyPayload: any = (event as any).payload;
      try {
        if (anyPayload?.tenantId) {
          const branding = await getTenantBranding(anyPayload.tenantId);
          companyName = branding.companyNameOverride || branding.tenantName;
          logoUrl = branding.logoUrl;
        }
      } catch {}
      const {subject, html} = timesheetApprovedEmail({
        employeeName: event.payload.employeeName,
        managerName: event.payload.managerName,
        period: event.payload.period,
        timesheetUrl: event.payload.url,
        locale: event.payload.locale,
        branding: { companyName, logoUrl }
      });
      await sendEmail({to: event.to, subject, html, tenantId: event.payload.tenantId});
      return { subject, html };
    }
    case 'deadline_reminder': {
      const {subject, html} = deadlineReminderEmail(event.payload);
      await sendEmail({to: event.to, subject, html});
      return { subject, html };
    }
    case 'manager_pending_reminder': {
      const {subject, html} = managerPendingReminderEmail(event.payload);
      await sendEmail({to: event.to, subject, html});
      return { subject, html };
    }
    case 'timesheet_submitted': {
      let companyName: string | undefined;
      let logoUrl: string | undefined;
      const anyPayload: any = (event as any).payload;
      try {
        if (anyPayload?.tenantId) {
          const branding = await getTenantBranding(anyPayload.tenantId);
          companyName = branding.companyNameOverride || branding.tenantName;
          logoUrl = branding.logoUrl;
        }
      } catch {}
      const {subject, html} = timesheetSubmittedEmail({ ...event.payload, branding: { companyName, logoUrl } });
      await sendEmail({to: event.to, subject, html, tenantId: anyPayload?.tenantId});
      return { subject, html };
    }
    case 'timesheet_adjusted': {
      let companyName: string | undefined;
      let logoUrl: string | undefined;
      try {
        if (event.payload.tenantId) {
          const branding = await getTenantBranding(event.payload.tenantId);
          companyName = branding.companyNameOverride || branding.tenantName;
          logoUrl = branding.logoUrl;
        }
      } catch {}
      const {subject, html} = timesheetAdjustedEmail({
        employeeName: event.payload.employeeName,
        managerName: event.payload.managerName,
        period: event.payload.period,
        justification: event.payload.justification,
        url: event.payload.url,
        locale: event.payload.locale,
        branding: { companyName, logoUrl }
      });
      await sendEmail({to: event.to, subject, html, tenantId: event.payload.tenantId});
      return { subject, html };
    }
  }
}
