# Invoice API Endpoints

**Version**: 1.0  
**Last Updated**: 2025-10-16  
**Base URL**: `/api/export`

## Overview

The Invoice API provides endpoints for generating invoices from timesheet data in formats compatible with the OMEGA Maximus Project Monthly Charge Rates system.

All endpoints require authentication via Supabase Auth. Multi-tenant isolation is enforced at the database level via Row Level Security (RLS).

---

## Endpoints

### 1. Generate OMEGA Invoice (Single)

Generate a single OMEGA-compliant invoice from a timesheet.

**Endpoint**: `POST /api/export/omega-invoice`

**Authentication**: Required (Bearer token)

**Request Body**:

```json
{
  "timesheetId": "uuid",
  "format": "json" | "csv" | "pdf",
  "rateType": "daily" | "hourly",
  "rateValue": 150.00,
  "currency": "GBP" | "USD" | "BRL",
  "costCenter": "CC-001",
  "callOff": "CO-2024-001",
  "notes": "Additional notes"
}
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `timesheetId` | string (UUID) | ✅ Yes | - | ID of the timesheet to export |
| `format` | string | No | `"json"` | Export format: `json`, `csv`, or `pdf` |
| `rateType` | string | No | `"daily"` | Rate calculation type |
| `rateValue` | number | No | Employee's rate | Rate value (overrides employee default) |
| `currency` | string | No | `"GBP"` | Currency code |
| `costCenter` | string | No | - | Cost center code |
| `callOff` | string | No | - | Call-off reference |
| `notes` | string | No | - | Additional notes |

**Response (JSON format)**:

```json
{
  "tenant_id": "uuid",
  "environment_slug": "omega",
  "employee": {
    "name": "John Doe",
    "id": "uuid",
    "position": "Engineer"
  },
  "vessel": {
    "name": "Vessel Alpha"
  },
  "cost_center": "CC-001",
  "call_off": "CO-2024-001",
  "period": {
    "start": "2024-10-01",
    "end": "2024-10-31"
  },
  "work": {
    "day_count": 20,
    "hours_regular": 160,
    "hours_overtime": 10
  },
  "rate": {
    "type": "daily",
    "value": 150.00,
    "currency": "GBP"
  },
  "total_amount": 3000.00,
  "notes": "Additional notes",
  "created_at": "2024-10-16T12:00:00Z",
  "updated_at": "2024-10-16T12:00:00Z"
}
```

**Response (CSV format)**:

```csv
tenant_id,environment_slug,employee_name,employee_position,vessel_name,cost_center,call_off,period_start,period_end,day_count,hours_regular,hours_overtime,rate_type,rate_value,currency,total_amount,notes
uuid,omega,John Doe,Engineer,Vessel Alpha,CC-001,CO-2024-001,2024-10-01,2024-10-31,20,160,10,daily,150.00,GBP,3000.00,Additional notes
```

**Response (PDF format)**:

Binary PDF file with invoice details.

**Status Codes**:

- `200 OK` - Invoice generated successfully
- `400 Bad Request` - Invalid parameters or validation failed
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied (tenant mismatch)
- `404 Not Found` - Timesheet not found
- `500 Internal Server Error` - Server error

**Error Response**:

```json
{
  "error": "Invoice validation failed",
  "errors": [
    "employee.name is required",
    "rate.value cannot be negative"
  ],
  "warnings": [
    "No work days or hours recorded"
  ]
}
```

---

### 2. Batch Export OMEGA Invoices

Export multiple timesheets as OMEGA invoices in a single request.

**Endpoint**: `GET /api/export/omega-invoice`

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timesheetIds` | string | ✅ Yes | Comma-separated list of timesheet UUIDs |
| `format` | string | No | Export format: `json`, `csv`, or `pdf` (default: `json`) |

**Example Request**:

```
GET /api/export/omega-invoice?timesheetIds=uuid1,uuid2,uuid3&format=csv
```

**Response (JSON format)**:

```json
[
  {
    "tenant_id": "uuid",
    "environment_slug": "omega",
    "employee": { ... },
    ...
  },
  {
    "tenant_id": "uuid",
    "environment_slug": "omega",
    "employee": { ... },
    ...
  }
]
```

**Response (CSV format)**:

All invoices in a single CSV file with headers.

**Status Codes**:

- `200 OK` - Invoices generated successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Server error

---

### 3. Legacy Invoice Export (Deprecated)

**Note**: This endpoint is deprecated. Use `/api/export/omega-invoice` instead.

**Endpoint**: `POST /api/export/invoice`

**Authentication**: Required (Bearer token)

**Request Body**:

```json
{
  "timesheetId": "uuid",
  "format": "json" | "pdf"
}
```

This endpoint generates invoices in the legacy format (not OMEGA-compliant).

---

## OMEGA Mapping Reference

The OMEGA invoice format is aligned with the OMEGA Maximus Project Monthly Charge Rates specification. See `docs/export/OMEGA-mapping-v1.md` for detailed field mappings.

### Key Mappings

| OMEGA Field | Timesheet Field | Description |
|-------------|-----------------|-------------|
| `Name` | `employee.name` | Employee full name |
| `Position/Call Off` | `employee.position` + `call_off` | Position and call-off reference |
| `Charge Rate (GBP)` | `rate.value` | Daily or hourly rate |
| `Days` | `work.day_count` | Number of work days |
| `Monthly Total (GBP)` | `total_amount` | Total invoice amount |

---

## Authentication

All endpoints require a valid Supabase Auth token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

Tokens can be obtained via Supabase Auth login:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session?.access_token;
```

---

## Rate Limiting

- **Rate Limit**: 100 requests per minute per user
- **Batch Limit**: Maximum 50 timesheets per batch export request

---

## Examples

### Example 1: Generate JSON Invoice

```bash
curl -X POST https://your-domain.com/api/export/omega-invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timesheetId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "json",
    "rateType": "daily",
    "rateValue": 200.00,
    "currency": "GBP"
  }'
```

### Example 2: Generate CSV Invoice

```bash
curl -X POST https://your-domain.com/api/export/omega-invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timesheetId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "csv"
  }' \
  -o invoice.csv
```

### Example 3: Batch Export

```bash
curl -X GET "https://your-domain.com/api/export/omega-invoice?timesheetIds=uuid1,uuid2,uuid3&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o invoices-batch.csv
```

### Example 4: JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Generate invoice
const response = await fetch('/api/export/omega-invoice', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authData.session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    timesheetId: '123e4567-e89b-12d3-a456-426614174000',
    format: 'json',
    rateType: 'daily',
    rateValue: 200.00,
    currency: 'GBP',
  }),
});

const invoice = await response.json();
console.log(invoice);
```

---

## Validation Rules

Invoices are validated before export. The following rules apply:

### Required Fields

- `tenant_id`
- `environment_slug`
- `employee.name`
- `employee.position`
- `vessel.name`
- `period.start`
- `period.end`

### Business Rules

- `period.end` must be after `period.start`
- `work.day_count` cannot be negative
- `work.hours_regular` cannot be negative
- `work.hours_overtime` cannot be negative
- `rate.value` cannot be negative
- `total_amount` cannot be negative
- `rate.type` must be `"daily"` or `"hourly"`
- `rate.currency` must be `"USD"`, `"BRL"`, or `"GBP"`

### Warnings (Non-blocking)

- No work days or hours recorded
- Rate value is zero
- Total amount is zero

---

## Troubleshooting

### Error: "Timesheet not found"

- Verify the `timesheetId` is correct
- Ensure the timesheet belongs to your tenant
- Check that the timesheet exists in the database

### Error: "Access denied: tenant mismatch"

- The timesheet belongs to a different tenant
- Verify you're logged in with the correct account

### Error: "Invoice validation failed"

- Check the error details in the response
- Ensure all required fields are present in the timesheet
- Verify rate values are positive numbers

### Error: "Tenant ID not found in user metadata"

- Re-login to refresh your session
- Contact support if the issue persists

---

## Support

For issues or questions:

- **Documentation**: `docs/`
- **GitHub Issues**: (repository URL)
- **Email**: support@abzgroup.com

---

## Changelog

### v1.0.0 (2025-10-16)

- Initial release
- OMEGA-compliant invoice generation
- Support for JSON, CSV, and PDF formats
- Batch export functionality
- Multi-tenant isolation
- Comprehensive validation

