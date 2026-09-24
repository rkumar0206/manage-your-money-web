export interface Expense {
  id: number;
  spentOn: string | null;
  amount: number;
  categoryId: number;
  categoryName: string | null;
  paymentMethods: string[] | null;
  synced: boolean;
  userId: number;
  created: string;
  modified: string;
}

export interface PaymentMethodResponse {
  methods?: string[];
}

export interface ExpenseCreateRequest {
  spentOn?: string | null;
  amount: number;
  categoryId: number;
  paymentMethods?: string[];
  created?: string;
}

export interface ExpenseUpdateRequest {
  spentOn?: string | null;
  amount: number;
  categoryId: number;
  paymentMethods?: string[];
  created?: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type AmountFilterOperator = 'IS_EQUALS_TO' | 'IS_LESS_THAN' | 'IS_GREATER_THAN' | 'IS_BETWEEN';

export type DateRangePreset =
  'ALL_TIME' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'PREVIOUS_WEEK' | 'PREVIOUS_MONTH' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_365_DAYS' | 'THIS_YEAR';

export interface ExpenseSearchRequest {
  spentOn?: string | null;
  categoryId?: number | null;
  paymentMethods?: string[] | null;
  amountOperator?: AmountFilterOperator | null;
  amount?: number | null;
  amountTo?: number | null;
  dateRangePreset?: DateRangePreset | null;
  createdFrom?: string | null; // ISO-8601
  createdTo?: string | null; // ISO-8601
}

export interface AmountOperatorOption {
  value: AmountFilterOperator;
  label: string;
  /** Whether the "second amount" input should be shown. */
  requiresSecondValue: boolean;
}

export interface DatePresetOption {
  value: DateRangePreset;
  label: string;
  /** Whether the custom from/to pickers should be shown alongside this preset. */
  allowsCustomRange: boolean;
}

export const AMOUNT_OPERATORS: readonly AmountOperatorOption[] = [
  { value: 'IS_EQUALS_TO', label: 'Equals', requiresSecondValue: false },
  { value: 'IS_LESS_THAN', label: 'Less than', requiresSecondValue: false },
  { value: 'IS_GREATER_THAN', label: 'Greater than', requiresSecondValue: false },
  { value: 'IS_BETWEEN', label: 'Between', requiresSecondValue: true },
];

export const DATE_RANGE_PRESETS: readonly DatePresetOption[] = [
  { value: 'ALL_TIME', label: 'All time', allowsCustomRange: true },
  { value: 'TODAY', label: 'Today', allowsCustomRange: false },
  { value: 'THIS_WEEK', label: 'This Week', allowsCustomRange: false },
  { value: 'THIS_MONTH', label: 'This month', allowsCustomRange: false },
  { value: 'PREVIOUS_WEEK', label: 'Previous Week', allowsCustomRange: false },
  { value: 'PREVIOUS_MONTH', label: 'Previous month', allowsCustomRange: false },
  { value: 'LAST_7_DAYS', label: 'Last 7 days', allowsCustomRange: false },
  { value: 'LAST_30_DAYS', label: 'Last 30 days', allowsCustomRange: false },
  { value: 'LAST_365_DAYS', label: 'Last 365 days', allowsCustomRange: false },
  { value: 'THIS_YEAR', label: 'This year', allowsCustomRange: false },
];

// ===========================================================================
// Stats DTOs (backed by /api/v1/expenses/stats/*)
// ===========================================================================

export interface MonthlyAmountDTO {
  month: number;      // 1–12
  monthName: string;  // "January"
  amount: number;
}

export interface CategoryStatsResponseDTO {
  categoryId: number;
  dateRangePreset: DateRangePreset;
  totalAmount: number;
}

export interface CategoryMonthlyStatsResponseDTO {
  year: number;
  categoryId: number | null;
  months: MonthlyAmountDTO[];
}

/** Assumed shape — verify against backend. */
export interface CategoryBreakdownItemDTO {
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  amount: number;
  /** Percentage of the total; present if backend computes it, null otherwise. */
  percentage?: number | null;
}

export interface CategoryBreakdownResponseDTO {
  dateRangePreset: DateRangePreset;
  totalAmount: number;
  categories: CategoryBreakdownItemDTO[];
}

/** Assumed shape — verify against backend. */
export interface PaymentMethodAmountDTO {
  paymentMethod: string;
  amount: number;
}

export interface PaymentMethodDistributionResponseDTO {
  dateRangePreset: DateRangePreset;
  paymentMethods: PaymentMethodAmountDTO[];
}

/** Assumed shape — verify against backend. */
export interface DayOfWeekAmountDTO {
  /** 1 (Monday) – 7 (Sunday) if numeric, or "MONDAY" if enum name. */
  dayOfWeek: number | string;
  dayName?: string;
  amount: number;
}

export interface DayOfWeekStatsResponseDTO {
  dateRangePreset: DateRangePreset;
  days: DayOfWeekAmountDTO[];
}

/** Assumed shape — verify against backend. */
export interface VendorAmountDTO {
  spentOn: string;
  amount: number;
}

export interface TopVendorsResponseDTO {
  dateRangePreset: DateRangePreset;
  limit: number;
  vendors: VendorAmountDTO[];
}

// ---------------------------------------------------------------------------
// KPI summary
// ---------------------------------------------------------------------------

export interface ExpenseSummaryResponseDTO {
  dateRangePreset: DateRangePreset;
  totalAmount: number;
  totalCount: number;
  avgAmount: number;
  largestExpense: number;
  minAmount: number;
}

// ---------------------------------------------------------------------------
// Daily heatmap
// ---------------------------------------------------------------------------

/** Assumed shape — verify against backend. */
export interface DailyAmountDTO {
  /** ISO date string, e.g. "2026-03-15". */
  date: string;
  amount: number;
}

export interface DailyStatsResponseDTO {
  year: number;
  /** 365 or 366 entries, one per calendar day, in date order. */
  days: DailyAmountDTO[];
}

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

export interface PaymentMethodOption {
  value: string;
  label: string;
  pillClass: string;
}

export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { value: 'UPI', label: 'UPI', pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  {
    value: 'CREDIT_CARD',
    label: 'Credit Card',
    pillClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  },
  {
    value: 'DEBIT_CARD',
    label: 'Debit Card',
    pillClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  { value: 'CASH', label: 'Cash', pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  {
    value: 'NET_BANKING',
    label: 'Net Banking',
    pillClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  { value: 'WALLET', label: 'Wallet', pillClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'OTHER', label: 'Other', pillClass: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const PAYMENT_METHOD_MAP: ReadonlyMap<string, PaymentMethodOption> = new Map(
  PAYMENT_METHODS.map((m) => [m.value, m]),
);

export const DEFAULT_PILL_CLASS = 'bg-slate-100 text-slate-700 border-slate-200';

// ---------------------------------------------------------------------------
// Spring envelope
// ---------------------------------------------------------------------------

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
