# @abz/timesheet-types

Shared TypeScript types for ABZ Timesheet Manager. Compatible with web and mobile applications.

## Installation

```bash
npm install @abz/timesheet-types
```

## Usage

### Import Types

```typescript
import {
  Timesheet,
  TimesheetEntry,
  Employee,
  Approval,
  TimesheetStatus,
  EntryType,
} from '@abz/timesheet-types';
```

### Core Entities

#### Timesheet

```typescript
import { Timesheet, TimesheetStatus } from '@abz/timesheet-types';

const timesheet: Timesheet = {
  id: 'uuid',
  employee_id: 'uuid',
  tenant_id: 'uuid',
  periodo_ini: '2024-10-01',
  periodo_fim: '2024-10-31',
  status: TimesheetStatus.DRAFT,
  created_at: '2024-10-01T00:00:00Z',
  updated_at: '2024-10-01T00:00:00Z',
};
```

#### TimesheetEntry

```typescript
import { TimesheetEntry, EntryType } from '@abz/timesheet-types';

const entry: TimesheetEntry = {
  id: 'uuid',
  timesheet_id: 'uuid',
  entry_date: '2024-10-01',
  tipo: EntryType.BOARDING,
  hora_ini: '08:00',
  hora_fim: '17:00',
  observacao: 'Regular shift',
  hours_regular: 8,
  hours_overtime: 0,
  created_at: '2024-10-01T00:00:00Z',
  updated_at: '2024-10-01T00:00:00Z',
};
```

#### Employee

```typescript
import { Employee } from '@abz/timesheet-types';

const employee: Employee = {
  id: 'uuid',
  tenant_id: 'uuid',
  display_name: 'John Doe',
  full_name: 'John Michael Doe',
  email: 'john.doe@example.com',
  position: 'Engineer',
  hourly_rate: 50.00,
  daily_rate: 400.00,
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};
```

### DTOs (Data Transfer Objects)

#### API Requests

```typescript
import {
  CreateTimesheetEntryRequest,
  ApproveTimesheetRequest,
  GenerateReportRequest,
} from '@abz/timesheet-types';

// Create entry
const createRequest: CreateTimesheetEntryRequest = {
  data: '2024-10-01',
  tipo: EntryType.BOARDING,
  hora_ini: '08:00',
  hora_fim: '17:00',
  observacao: 'Regular shift',
};

// Approve timesheet
const approveRequest: ApproveTimesheetRequest = {
  timesheet_id: 'uuid',
  message: 'Approved',
};

// Generate report
const reportRequest: GenerateReportRequest = {
  type: 'summary',
  start_date: '2024-10-01',
  end_date: '2024-10-31',
};
```

#### API Responses

```typescript
import {
  PendingTimesheetsResponse,
  SummaryReportResponse,
  InvoiceResponse,
} from '@abz/timesheet-types';

// Pending timesheets
const response: PendingTimesheetsResponse = {
  items: [
    {
      id: 'uuid',
      employee_name: 'John Doe',
      period_start: '2024-10-01',
      period_end: '2024-10-31',
      status: TimesheetStatus.SUBMITTED,
      entry_count: 20,
      submitted_at: '2024-10-31T23:59:59Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};
```

### Enums

```typescript
import {
  TimesheetStatus,
  EntryType,
  ApprovalStatus,
  UserRole,
  NotificationType,
  NotificationEvent,
} from '@abz/timesheet-types';

// Timesheet statuses
TimesheetStatus.DRAFT       // 'rascunho'
TimesheetStatus.SUBMITTED   // 'enviado'
TimesheetStatus.APPROVED    // 'aprovado'
TimesheetStatus.REJECTED    // 'recusado'

// Entry types
EntryType.BOARDING          // 'embarque'
EntryType.DISEMBARKING      // 'desembarque'
EntryType.TRANSFER          // 'translado'

// User roles
UserRole.EMPLOYEE           // 'employee'
UserRole.MANAGER            // 'manager'
UserRole.ADMIN              // 'admin'
```

### Utility Types

```typescript
import {
  DeepPartial,
  Nullable,
  Result,
  DateRange,
  PaginationMeta,
} from '@abz/timesheet-types';

// Deep partial
type PartialTimesheet = DeepPartial<Timesheet>;

// Nullable
type NullableString = Nullable<string>; // string | null

// Result type
const result: Result<Timesheet, Error> = {
  success: true,
  data: timesheet,
};

// Date range
const range: DateRange = {
  start: '2024-10-01',
  end: '2024-10-31',
};

// Pagination
const meta: PaginationMeta = {
  page: 1,
  page_size: 10,
  total: 100,
  total_pages: 10,
};
```

## Type Categories

### Core Entities
- `Timesheet` - Timesheet entity
- `TimesheetEntry` - Timesheet entry
- `Employee` - Employee entity
- `User` - User entity
- `Approval` - Approval entity
- `Tenant` - Tenant entity
- `Vessel` - Vessel entity
- `Notification` - Notification entity

### DTOs
- Request types (e.g., `CreateTimesheetEntryRequest`)
- Response types (e.g., `PendingTimesheetsResponse`)
- Pagination types
- Error types

### Enums
- `TimesheetStatus`
- `EntryType`
- `ApprovalStatus`
- `UserRole`
- `NotificationType`
- `NotificationEvent`

### Utility Types
- `DeepPartial<T>`
- `DeepRequired<T>`
- `Nullable<T>`
- `Maybe<T>`
- `Result<T, E>`
- `DateRange`
- `PaginationMeta`

## Mobile Integration

This package is designed to work seamlessly with React Native and Expo:

```typescript
// React Native / Expo
import { Timesheet, Employee } from '@abz/timesheet-types';

// Use types in your mobile app
interface TimesheetScreenProps {
  timesheet: Timesheet;
  employee: Employee;
}
```

## API Integration

### Fetch with Types

```typescript
import { PendingTimesheetsResponse } from '@abz/timesheet-types';

async function fetchPendingTimesheets(): Promise<PendingTimesheetsResponse> {
  const response = await fetch('/api/manager/pending-timesheets');
  return response.json();
}
```

### Axios with Types

```typescript
import axios from 'axios';
import { Timesheet, CreateTimesheetEntryRequest } from '@abz/timesheet-types';

async function createEntry(
  timesheetId: string,
  data: CreateTimesheetEntryRequest
): Promise<Timesheet> {
  const response = await axios.post<Timesheet>(
    `/api/employee/timesheets/${timesheetId}/entries`,
    data
  );
  return response.data;
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Clean

```bash
npm run clean
```

## License

MIT

## Repository

https://github.com/abz-group/time-sheet-manager-abz-group

## Support

For issues or questions, please open an issue on GitHub.

