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
import { DateRangePreset, TopVendorsResponseDTO } from '../../../expense/models/expense.model';
import { INK_GRID, INK_TEXT, INK_TOOLTIP_BG } from '../../models/dashboard.model';

@Component({
  selector: 'app-top-vendors',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, BaseChartDirective],
  templateUrl: './top-vendors.component.html' ,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopVendorsComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly dateRangePreset = input<DateRangePreset>('THIS_YEAR');
  readonly presetLabel = input<string>('This year');
  readonly limit = input<number>(5);

  protected readonly data = signal<TopVendorsResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chartType = 'bar' as const;

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const d = this.data();
    return {
      labels: (d?.vendors ?? []).map((v) => this.truncate(v.spentOn)),
      datasets: [
        {
          data: (d?.vendors ?? []).map((v) => Number(v.amount) || 0),
          label: 'Spent',
          backgroundColor: 'rgba(6, 182, 212, 0.55)',
          borderColor: '#06b6d4',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
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
      y: { grid: { display: false }, ticks: { color: INK_TEXT, font: { size: 11 } } },
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
            return this.data()?.vendors[idx]?.spentOn ?? '';
          },
          label: (ctx) =>
            new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 2,
            }).format(ctx.parsed.x ?? 0),
        },
      },
    },
  };

  constructor() {
    effect(() => {
      const preset = this.dateRangePreset();
      const lim = this.limit();
      untracked(() => this.load(preset, lim));
    });
  }

  protected reload(): void {
    this.load(this.dateRangePreset(), this.limit());
  }

  private load(preset: DateRangePreset, limit: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stats
      .getTopVendors(preset, limit)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load top vendors.'),
      });
  }

  private truncate(s: string): string {
    return s.length > 18 ? `${s.slice(0, 16)}…` : s;
  }
}
