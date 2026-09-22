import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DateRangePreset } from '../../../expense/models/expense.model';
import { ExpenseStatsService } from '../../../expense/services/expense-stats.service';
import { ExpenseSummaryResponseDTO } from '../../../expense/models/expense.model';

interface Kpi {
  label: string;
  value: string;
  hint: string;
  iconPath: string;
  accent: string;
}

@Component({
  selector: 'app-kpi-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiRowComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly dateRangePreset = input<DateRangePreset>('THIS_YEAR');
  readonly presetLabel = input<string>('This year');

  protected readonly summary = signal<ExpenseSummaryResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly kpis = computed<Kpi[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      {
        label: 'Total spent',
        value: this.formatCurrency(s.totalAmount),
        hint: this.presetLabel(),
        accent: 'indigo',
        iconPath:
          'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
      },
      {
        label: 'Expenses',
        value: new Intl.NumberFormat('en-IN').format(s.totalCount),
        hint: 'entries logged',
        accent: 'fuchsia',
        iconPath:
          'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
      },
      {
        label: 'Average',
        value: this.formatCurrency(s.avgAmount),
        hint: 'per expense',
        accent: 'cyan',
        iconPath:
          'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
      },
      {
        label: 'Largest',
        value: this.formatCurrency(s.largestExpense),
        hint: 'single expense',
        accent: 'amber',
        iconPath:
          'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
      },
    ];
  });

  constructor() {
    effect(() => {
      const preset = this.dateRangePreset();
      untracked(() => this.load(preset));
    });
  }

  protected reload(): void {
    this.load(this.dateRangePreset());
  }

  private load(preset: DateRangePreset): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stats
      .getSummary(preset)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.summary.set(data),
        error: () => this.errorMessage.set('Could not load summary.'),
      });
  }

  private formatCurrency(v: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }
}
