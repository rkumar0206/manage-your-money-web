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
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ExpenseCategory } from '../../models/expense-category.model';
import { DATE_RANGE_PRESETS, DateRangePreset } from '../../../expense/models/expense.model';
import { ExpenseCategoryService } from '../../services/expense-category.service';
import { ExpenseService } from '../../../expense/services/expense.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExpenseStatsService } from '../../../expense/services/expense-stats.service';

type MonthlySummary = {
  year: number;
  categoryId: number | null;
  months: { month: number; monthName: string; amount: number }[];
};

/** Custom range isn't supported on this page — user would need date pickers. */
const TOTAL_DATE_PRESETS = DATE_RANGE_PRESETS;

const MIN_YEAR = 2018;

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, BaseChartDirective],
  templateUrl: './category-detail.component.html',
  styleUrl: './category-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDetailComponent {
  private readonly categoryService = inject(ExpenseCategoryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly expenseStats = inject(ExpenseStatsService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  // ===========================================================================
  // Category
  // ===========================================================================
  protected readonly category = signal<ExpenseCategory | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // ===========================================================================
  // Total card
  // ===========================================================================
  protected readonly categoryTotal = signal<number | null>(null);
  protected readonly isLoadingTotal = signal(false);
  protected readonly selectedDateRangePreset = signal<DateRangePreset>('ALL_TIME');
  protected readonly totalDatePresets = TOTAL_DATE_PRESETS;

  // ===========================================================================
  // Chart
  // ===========================================================================
  protected readonly monthlyData = signal<MonthlySummary | null>(null);
  protected readonly isLoadingChart = signal(false);
  protected readonly selectedYear = signal<number>(new Date().getFullYear());
  protected readonly availableYears = computed<number[]>(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= MIN_YEAR; y--) years.push(y);
    return years;
  });
  protected readonly barChartType = 'bar' as const;

  // ===========================================================================
  // Shared payment-method filter
  // ===========================================================================
  protected readonly availablePaymentMethods = signal<string[]>([]);
  protected readonly selectedPaymentMethods = signal<ReadonlySet<string>>(new Set());

  // ===========================================================================
  // Delete dialog
  // ===========================================================================
  protected readonly showDeleteDialog = signal(false);
  protected readonly deleteLoading = signal(false);

  protected readonly deleteMessage = computed(() => {
    const c = this.category();
    return c ? `"${c.name}" will be permanently removed. This action cannot be undone.` : '';
  });

  // ===========================================================================
  // Chart config
  // ===========================================================================
  protected readonly barChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const data = this.monthlyData();
    return {
      labels: data?.months.map((m) => m.monthName) ?? [],
      datasets: [
        {
          data: data?.months.map((m) => Number(m.amount) || 0) ?? [],
          label: 'Amount spent',
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  protected readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            const n = Number(value);
            if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
            if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
            if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
            return `₹${n}`;
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          callback: (_value, index) => {
            const month = this.monthlyData()?.months[index];
            if (!month) return '';
            const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
            return narrow ? month.monthName.charAt(0) : month.monthName.slice(0, 3);
          },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            return this.monthlyData()?.months[idx]?.monthName ?? '';
          },
          label: (context) =>
            new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 2,
            }).format(context.parsed.y ?? 0),
        },
      },
    },
  };

  // ===========================================================================
  // Lifecycle
  // ===========================================================================
  constructor() {
    // Category + payment-method list, on route-param change
    effect(() => {
      const categoryId = this.id();
      if (!categoryId) return;
      untracked(() => {
        this.loadCategory(Number(categoryId));
        this.loadPaymentMethods();
      });
    });

    // Total card: refetch on date preset or payment-method change
    effect(() => {
      const categoryId = this.id();
      const preset = this.selectedDateRangePreset();
      const methods = this.selectedPaymentMethods();
      if (!categoryId) return;
      untracked(() => this.fetchTotal(Number(categoryId), preset, [...methods]));
    });

    // Chart: refetch on year or payment-method change
    effect(() => {
      const categoryId = this.id();
      const year = this.selectedYear();
      const methods = this.selectedPaymentMethods();
      if (!categoryId) return;
      untracked(() => this.fetchChart(Number(categoryId), year, [...methods]));
    });
  }

  // ===========================================================================
  // Loaders
  // ===========================================================================
  private loadCategory(categoryId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.categoryService
      .getById(categoryId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.category.set(data),
        error: () => this.errorMessage.set('Could not load this category.'),
      });
  }

  private loadPaymentMethods(): void {
    this.expenseService.distinctPaymentMethods().subscribe({
      next: (methods) => this.availablePaymentMethods.set(methods.methods ?? []),
      error: () => {
        /* silent — non-critical */
      },
    });
  }

  private fetchTotal(categoryId: number, preset: DateRangePreset, paymentMethods: string[]): void {
    this.isLoadingTotal.set(true);
    this.expenseStats
      .getCategoryTotalForDateRange(
        categoryId,
        preset,
        paymentMethods.length ? paymentMethods : undefined,
      )
      .pipe(finalize(() => this.isLoadingTotal.set(false)))
      .subscribe({
        next: (res) => this.categoryTotal.set(Number(res.totalAmount) || 0),
        error: () => this.categoryTotal.set(null),
      });
  }

  private fetchChart(categoryId: number, year: number, paymentMethods: string[]): void {
    this.isLoadingChart.set(true);
    this.expenseStats
      .getMonthlyTotalsForYear(year, categoryId, paymentMethods.length ? paymentMethods : undefined)
      .pipe(finalize(() => this.isLoadingChart.set(false)))
      .subscribe({
        next: (data) => this.monthlyData.set(data),
        error: () => this.monthlyData.set(null),
      });
  }

  // ===========================================================================
  // Filter mutations
  // ===========================================================================
  protected onDateRangeChange(value: string): void {
    this.selectedDateRangePreset.set(value as DateRangePreset);
  }

  protected onYearChange(value: string): void {
    const y = Number(value);
    if (!Number.isNaN(y)) this.selectedYear.set(y);
  }

  protected togglePaymentMethod(method: string): void {
    this.selectedPaymentMethods.update((curr) => {
      const next = new Set(curr);
      next.has(method) ? next.delete(method) : next.add(method);
      return next;
    });
  }

  protected isPaymentSelected(method: string): boolean {
    return this.selectedPaymentMethods().has(method);
  }

  // ===========================================================================
  // Delete
  // ===========================================================================
  protected openDeleteDialog(): void {
    this.showDeleteDialog.set(true);
  }

  protected closeDeleteDialog(): void {
    if (this.deleteLoading()) return;
    this.showDeleteDialog.set(false);
  }

  protected onConfirmDelete(): void {
    const c = this.category();
    if (!c) return;

    this.deleteLoading.set(true);
    this.categoryService
      .remove(c.id)
      .pipe(finalize(() => this.deleteLoading.set(false)))
      .subscribe({
        next: () => {
          this.showDeleteDialog.set(false);
          this.router.navigate(['/categories']);
        },
        error: () => {
          this.errorMessage.set('Could not delete the category. Please try again.');
          this.showDeleteDialog.set(false);
        },
      });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================
  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }
}
