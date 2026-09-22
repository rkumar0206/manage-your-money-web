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
import { ExpenseStatsService } from '../../../expense/services/expense-stats.service';
import { DashboardCardComponent } from '../../components/dashboard-card/dashboard-card.component';
import { DailyAmountDTO, DailyStatsResponseDTO } from '../../../expense/models/expense.model';

interface HeatCell {
  date: string;
  day: number;
  amount: number;
  level: 0 | 1 | 2 | 3 | 4;
  inMonth: boolean;
}

interface MonthGrid {
  monthIndex: number;
  monthName: string;
  cells: HeatCell[];
}

@Component({
  selector: 'app-daily-heatmap',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent],
  templateUrl: './daily-heatmap.component.html' ,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyHeatmapComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly year = input<number>(new Date().getFullYear());

  protected readonly data = signal<DailyStatsResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly months = computed<MonthGrid[]>(() => {
    const d = this.data();
    if (!d) return [];
    return this.buildMonths(d);
  });

  constructor() {
    effect(() => {
      const year = this.year();
      untracked(() => this.load(year));
    });
  }

  protected reload(): void {
    this.load(this.year());
  }

  private load(year: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stats
      .getDailyStats(year)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load daily stats.'),
      });
  }

  private buildMonths(d: DailyStatsResponseDTO): MonthGrid[] {
    const max = Math.max(1, ...d.days.map((x) => Number(x.amount) || 0));
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const byDate = new Map<string, DailyAmountDTO>();
    for (const day of d.days) byDate.set(day.date, day);

    return monthNames.map((name, monthIndex) => {
      const first = new Date(d.year, monthIndex, 1);
      const daysInMonth = new Date(d.year, monthIndex + 1, 0).getDate();
      // Pad to align first day with its weekday (Mon=0 … Sun=6)
      const firstWeekday = (first.getDay() + 6) % 7;

      const cells: HeatCell[] = [];

      for (let i = 0; i < firstWeekday; i++) {
        cells.push({ date: `pad-${monthIndex}-${i}`, day: 0, amount: 0, level: 0, inMonth: false });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${d.year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const amount = Number(byDate.get(iso)?.amount ?? 0);
        cells.push({
          date: iso,
          day,
          amount,
          level: this.levelOf(amount, max),
          inMonth: true,
        });
      }

      return { monthIndex, monthName: name, cells };
    });
  }

  private levelOf(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
    if (amount <= 0) return 0;
    const ratio = amount / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  protected levelClass(level: number): string {
    switch (level) {
      case 1:
        return 'bg-indigo-200';
      case 2:
        return 'bg-indigo-400';
      case 3:
        return 'bg-indigo-500';
      case 4:
        return 'bg-indigo-700';
      default:
        return 'bg-slate-100';
    }
  }

  protected formatCurrency(v: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }
}
