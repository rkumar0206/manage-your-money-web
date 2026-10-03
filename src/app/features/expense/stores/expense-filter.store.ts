import { Injectable, signal } from '@angular/core';
import { AmountFilterOperator, DateRangePreset } from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseFilterStore {
  readonly searchTerm = signal('');
  readonly categoryId = signal<number | null>(null);
  readonly paymentMethods = signal<ReadonlySet<string>>(new Set());
  readonly amountOperator = signal<AmountFilterOperator | null>(null);
  readonly amount = signal<number | null>(null);
  readonly amountTo = signal<number | null>(null);
  readonly dateRangePreset = signal<DateRangePreset>('THIS_MONTH');
  readonly createdFrom = signal('');
  readonly createdTo = signal('');

  reset(): void {
    this.searchTerm.set('');
    this.categoryId.set(null);
    this.paymentMethods.set(new Set());
    this.amountOperator.set(null);
    this.amount.set(null);
    this.amountTo.set(null);
    this.dateRangePreset.set('THIS_MONTH');
    this.createdFrom.set('');
    this.createdTo.set('');
  }
}
