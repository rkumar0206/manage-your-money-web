import { Injectable, signal } from '@angular/core';
import { DateRangePreset } from '../../expense/models/expense.model';

const CURRENT_YEAR = new Date().getFullYear();

@Injectable({ providedIn: 'root' })
export class DashboardFilterStore {
  readonly dateRangePreset = signal<DateRangePreset>('THIS_YEAR');
  readonly selectedYear = signal<number>(CURRENT_YEAR);
  readonly paymentMethods = signal<ReadonlySet<string>>(new Set());

  reset(): void {
    this.dateRangePreset.set('THIS_YEAR');
    this.selectedYear.set(CURRENT_YEAR);
    this.paymentMethods.set(new Set());
  }
}
