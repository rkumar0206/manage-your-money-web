export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  totalExpenseAmount: number;
  isSynced: boolean;
  userId: number;
  created: string; // ISO-8601 (Instant serialized)
  modified: string; // ISO-8601
}

export interface ExpenseCategoryCreateRequest {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface ExpenseCategoryUpdateRequest {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isSynced: boolean;
}

/** Spring Data `Page<T>` envelope returned by `GET /api/v1/expense-categories`. */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
