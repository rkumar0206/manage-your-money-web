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
import {
  DateRangePreset,
  PaymentMethodDistributionResponseDTO,
  PAYMENT_METHOD_MAP,
} from '../../../expense/models/expense.model';
import { CHART_PALETTE, INK_TOOLTIP_BG } from '../../models/dashboard.model';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, BaseChartDirective],
  templateUrl: 'payment-methods.component.html' ,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsComponent {
  private readonly stats = inject(ExpenseStatsService);

  readonly dateRangePreset = input<DateRangePreset>('THIS_YEAR');
  readonly presetLabel = input<string>('This year');

  protected readonly data = signal<PaymentMethodDistributionResponseDTO | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly palette = CHART_PALETTE;
  protected readonly chartType = 'doughnut' as const;

  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const d = this.data();
    return {
      labels: (d?.paymentMethods ?? []).map((m) => this.methodLabel(m.paymentMethod)),
      datasets: [
        {
          data: (d?.paymentMethods ?? []).map((m) => Number(m.amount) || 0),
          backgroundColor: (d?.paymentMethods ?? []).map(
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
      .getPaymentMethodDistribution(preset)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.data.set(res),
        error: () => this.errorMessage.set('Could not load payment distribution.'),
      });
  }

  protected methodLabel(m: string): string {
    return PAYMENT_METHOD_MAP.get(m)?.label ?? m.replace(/_/g, ' ');
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
