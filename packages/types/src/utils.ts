/**
 * Utility types
 */

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make all properties required recursively
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Pick properties by type
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

// Omit properties by type
export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P];
};

// Make specific properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Extract keys of a specific type
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Nullable type
export type Nullable<T> = T | null;

// Maybe type
export type Maybe<T> = T | null | undefined;

// Result type for operations that can fail
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Async result type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// ID types
export type UUID = string;
export type Timestamp = string; // ISO 8601 format

// Date range
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

// Sort options
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Filter options
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

