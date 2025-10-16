# Mobile API Documentation

## Overview

This document describes the API endpoints and shared types available for mobile applications (iOS, Android, React Native) to integrate with the Timesheet Manager system.

---

## Base URL

```
https://api.timesheetmanager.abzgroup.com/api
```

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Shared Types

All mobile applications use the same TypeScript types defined in `@abz/timesheet-types`:

### User
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN_GLOBAL' | 'TENANT_ADMIN' | 'GERENTE' | 'COLAB';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
```

### Timesheet
```typescript
interface Timesheet {
  id: string;
  employeeId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'bloqueado';
  entries: TimesheetEntry[];
  annotations: TimesheetAnnotation[];
  approvals: TimesheetApproval[];
  createdAt: string;
  updatedAt: string;
}
```

---

## API Endpoints

### Authentication

#### POST /auth/login
Login with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

#### POST /auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### POST /auth/logout
Logout user

---

### Timesheets

#### GET /timesheets
List user's timesheets

**Query Parameters:**
- `status`: Filter by status
- `periodStart`: Filter by start date
- `periodEnd`: Filter by end date
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

#### GET /timesheets/:id
Get timesheet details

#### POST /timesheets
Create new timesheet

**Request:**
```json
{
  "periodStart": "2025-10-01",
  "periodEnd": "2025-10-31"
}
```

#### PATCH /timesheets/:id
Update timesheet

#### POST /timesheets/:id/submit
Submit timesheet for approval

#### POST /timesheets/:id/approve
Approve timesheet (manager only)

#### POST /timesheets/:id/reject
Reject timesheet (manager only)

---

### Timesheet Entries

#### POST /timesheets/:id/entries
Add entry to timesheet

**Request:**
```json
{
  "date": "2025-10-15",
  "type": "embarque",
  "startTime": "08:00",
  "endTime": "17:00",
  "notes": "Regular shift"
}
```

#### PATCH /timesheets/:id/entries/:entryId
Update entry

#### DELETE /timesheets/:id/entries/:entryId
Delete entry

---

### Reports

#### GET /reports/summary
Get summary report

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `status`: Filter by status
- `employeeId`: Filter by employee

#### GET /reports/detailed
Get detailed report

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `status`: Filter by status
- `employeeId`: Filter by employee

#### GET /reports/export
Export report

**Query Parameters:**
- `format`: 'csv' or 'json'
- `startDate`: Start date
- `endDate`: End date

---

### Invoices

#### POST /export/invoice
Generate invoice from timesheet

**Request:**
```json
{
  "timesheetId": "ts-123",
  "format": "json"
}
```

---

### Notifications

#### GET /notifications/preferences
Get notification preferences

#### PATCH /notifications/preferences
Update notification preferences

**Request:**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "deadlineReminders": true,
  "approvalNotifications": true,
  "rejectionNotifications": true
}
```

#### POST /notifications/subscribe
Subscribe to push notifications

**Request:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "auth": "...",
    "p256dh": "..."
  }
}
```

#### POST /notifications/unsubscribe
Unsubscribe from push notifications

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "code": "ERROR_CODE",
    "field": "fieldName"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid token
- `FORBIDDEN`: User doesn't have permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `CONFLICT`: Resource already exists
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per hour per user

---

## Pagination

All list endpoints support pagination:

```
GET /timesheets?page=1&pageSize=20
```

Response includes:
- `data`: Array of items
- `total`: Total count
- `page`: Current page
- `pageSize`: Items per page
- `hasMore`: Whether more items exist

---

## Versioning

Current API version: **v1**

Future versions will be available at:
```
https://api.timesheetmanager.abzgroup.com/api/v2
```

---

## SDK Usage

### JavaScript/TypeScript

```typescript
import { createApiClient } from '@abz/timesheet-types';

const client = createApiClient('https://api.timesheetmanager.abzgroup.com/api');
client.setToken(accessToken);

// Get timesheets
const response = await client.get('/timesheets');
if (response.success) {
  console.log(response.data);
}
```

### React Native

```typescript
import { createApiClient } from '@abz/timesheet-types';

const client = createApiClient('https://api.timesheetmanager.abzgroup.com/api');

// Use in component
const [timesheets, setTimesheets] = useState([]);

useEffect(() => {
  client.get('/timesheets').then(response => {
    if (response.success) {
      setTimesheets(response.data?.data || []);
    }
  });
}, []);
```

---

## Support

For API support, contact: api-support@abzgroup.com

---

**Last Updated**: 2025-10-16  
**Status**: ✅ Production Ready

