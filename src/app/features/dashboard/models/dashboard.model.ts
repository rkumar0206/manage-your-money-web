import { DateRangePreset } from '../../expense/models/expense.model';

/** Global filter context passed from the dashboard to every widget. */
export interface DashboardFilter {
  dateRangePreset: DateRangePreset;
  paymentMethods: string[];
  year: number;
}

/** Shared color palette for charts. */
export const CHART_PALETTE: readonly string[] = [
  '#6366f1', // indigo
  '#d946ef', // fuchsia
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export const INK_GRID = 'rgba(148, 163, 184, 0.15)';
export const INK_TEXT = '#64748b';
export const INK_TOOLTIP_BG = 'rgba(15, 23, 42, 0.9)';
