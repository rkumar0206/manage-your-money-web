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
import { CategoryMonthlyStatsResponseDTO } from '../../../expense/models/expense.model';
import { CHART_PALETTE, INK_GRID, INK_TEXT, INK_TOOLTIP_BG } from '../../models/dashboard.model';

@Component({
  selector: 'app-monthly-trend',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, BaseChartDirective],
  templateUrl: './monthly-trend.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyTrendComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly year = input<number>(new Date().getFullYear());
  readonly paymentMethods = input<string[]>([]);

  protected readonly data = signal<CategoryMonthlyStatsResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chartType = 'bar' as const;

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const d = this.data();
    return {
      labels: d?.months.map((m) => m.monthName.slice(0, 3)) ?? [],
      datasets: [
        {
          data: d?.months.map((m) => Number(m.amount) || 0) ?? [],
          label: 'Spent',
          backgroundColor: 'rgba(99, 102, 241, 0.55)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: '#6366f1',
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
      x: {
        grid: { display: false },
        ticks: { color: INK_TEXT, font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: INK_TOOLTIP_BG,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            return this.data()?.months[idx]?.monthName ?? '';
          },
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
      const year = this.year();
      const methods = this.paymentMethods();
      untracked(() => this.load(year, methods));
    });
  }

  protected reload(): void {
    this.load(this.year(), this.paymentMethods());
  }

  private load(year: number, paymentMethods: string[]): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stats
      .getMonthlyTotalsForYear(year, undefined, paymentMethods.length ? paymentMethods : undefined)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load monthly data.'),
      });
  }
}
