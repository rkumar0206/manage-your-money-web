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
import { CategoryBreakdownResponseDTO } from '../../../expense/models/expense.model';
import { DateRangePreset } from '../../../expense/models/expense.model';
import { CHART_PALETTE, INK_TOOLTIP_BG } from '../../models/dashboard.model';

@Component({
  selector: 'app-category-breakdown',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, BaseChartDirective],
  templateUrl: './category-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly dateRangePreset = input<DateRangePreset>('THIS_YEAR');
  readonly presetLabel = input<string>('This year');
  readonly topN = input<number>(6);

  protected readonly data = signal<CategoryBreakdownResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly palette = CHART_PALETTE;
  protected readonly chartType = 'doughnut' as const;

  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const d = this.data();
    return {
      labels: d?.categories.map((c) => c.categoryName) ?? [],
      datasets: [
        {
          data: d?.categories.map((c) => Number(c.amount) || 0) ?? [],
          backgroundColor: (d?.categories ?? []).map(
            (_, i) => CHART_PALETTE[i % CHART_PALETTE.length],
          ),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: INK_TOOLTIP_BG,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 2,
            }).format(Number(ctx.parsed) || 0)}`,
        },
      },
    },
  };

  constructor() {
    effect(() => {
      const preset = this.dateRangePreset();
      const n = this.topN();
      untracked(() => this.load(preset, n));
    });
  }

  protected reload(): void {
    this.load(this.dateRangePreset(), this.topN());
  }

  private load(preset: DateRangePreset, topN: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stats
      .getCategoryBreakdown(preset, topN)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load breakdown.'),
      });
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
