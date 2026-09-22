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
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ExpenseStatsService } from '../../../expense/services/expense-stats.service';
import { DashboardCardComponent } from '../../components/dashboard-card/dashboard-card.component';
import { DateRangePreset, DayOfWeekStatsResponseDTO } from '../../../expense/models/expense.model';
import { INK_GRID, INK_TEXT, INK_TOOLTIP_BG } from '../../models/dashboard.model';

const DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-day-of-week',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, BaseChartDirective],
  templateUrl: './day-of-week.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayOfWeekComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly dateRangePreset = input<DateRangePreset>('THIS_YEAR');
  readonly presetLabel = input<string>('This year');

  protected readonly data = signal<DayOfWeekStatsResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chartType = 'bar' as const;

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const d = this.data();
    const days = d?.days ?? [];

    return {
      labels: DAYS,
      datasets: [
        {
          data: days.map((x) => Number(x.amount) || 0),
          label: 'Spent',
          backgroundColor: days.map((_, i) =>
            i >= 5 ? 'rgba(217, 70, 239, 0.55)' : 'rgba(99, 102, 241, 0.55)',
          ) as string[],
          borderColor: days.map((_, i) => (i >= 5 ? '#d946ef' : '#6366f1')) as string[],
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: INK_GRID },
        ticks: {
          color: INK_TEXT,
          font: { size: 11 },
          callback: (v) => {
            const n = Number(v);
            if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
            if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
            if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
            return `₹${n}`;
          },
        },
      },
      x: { grid: { display: false }, ticks: { color: INK_TEXT, font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: INK_TOOLTIP_BG,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) =>
            new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 2,
            }).format(ctx.parsed.y ?? 0),
        },
      },
    },
  };

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
      .getDayOfWeekStats(preset)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load day-of-week stats.'),
      });
  }
}
