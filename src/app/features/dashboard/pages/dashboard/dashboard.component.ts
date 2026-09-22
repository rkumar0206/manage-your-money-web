import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DATE_RANGE_PRESETS, DateRangePreset } from '../../../expense/models/expense.model';
import { ExpenseService } from '../../../expense/services/expense.service';
import { DashboardFilter } from '../../models/dashboard.model';
import { KpiRowComponent } from '../../widgets/kpi-row/kpi-row.component';
import { MonthlyTrendComponent } from '../../widgets/monthly-trend/monthly-trend.component';
import { CategoryBreakdownComponent } from '../../widgets/category-breakdown/category-breakdown.component';
import { PaymentMethodsComponent } from '../../widgets/payment-methods/payment-methods.component';
import { DayOfWeekComponent } from '../../widgets/day-of-week/day-of-week.component';
import { TopVendorsComponent } from '../../widgets/top-vendors/top-vendors.component';
import { RecentExpensesComponent } from '../../widgets/recent-expenses/recent-expenses.component';
import { DailyHeatmapComponent } from '../../widgets/daily-heatmap/daily-heatmap.component';

const MIN_YEAR = 2018;
const DASHBOARD_PRESETS = DATE_RANGE_PRESETS.filter((p) => p.value !== 'CUSTOM');

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiRowComponent,
    MonthlyTrendComponent,
    CategoryBreakdownComponent,
    PaymentMethodsComponent,
    DayOfWeekComponent,
    TopVendorsComponent,
    RecentExpensesComponent,
    DailyHeatmapComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly expenseService = inject(ExpenseService);

  // ---- Global filter signals ----
  protected readonly dateRangePreset = signal<DateRangePreset>('THIS_YEAR');
  protected readonly selectedPaymentMethods = signal<string[]>([]);
  protected readonly selectedYear = signal<number>(new Date().getFullYear());

  protected readonly presets = DASHBOARD_PRESETS;
  protected readonly availablePaymentMethods = signal<string[]>([]);
  protected readonly isLoadingMethods = signal(false);

  protected readonly availableYears = computed<number[]>(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= MIN_YEAR; y--) years.push(y);
    return years;
  });

  /** Human label of the current preset — passed to widgets as subtitle. */
  protected readonly presetLabel = computed(
    () => this.presets.find((p) => p.value === this.dateRangePreset())?.label ?? 'All time',
  );

  /** The single filter context — a snapshot passed down to each widget. */
  protected readonly filter = computed<DashboardFilter>(() => ({
    dateRangePreset: this.dateRangePreset(),
    paymentMethods: this.selectedPaymentMethods(),
    year: this.selectedYear(),
  }));

  constructor() {
    this.loadPaymentMethods();
  }

  // ---- Filter mutations ----

  protected onDateRangeChange(value: string): void {
    this.dateRangePreset.set(value as DateRangePreset);
  }

  protected onYearChange(value: string): void {
    const y = Number(value);
    if (!Number.isNaN(y)) this.selectedYear.set(y);
  }

  protected togglePaymentMethod(m: string): void {
    this.selectedPaymentMethods.update((curr) =>
      curr.includes(m) ? curr.filter((x) => x !== m) : [...curr, m],
    );
  }

  protected isPaymentSelected(m: string): boolean {
    return this.selectedPaymentMethods().includes(m);
  }

  protected clearPaymentMethods(): void {
    this.selectedPaymentMethods.set([]);
  }

  protected methodLabel(m: string): string {
    return m.replace(/_/g, ' ');
  }

  // ---- Loaders ----

  private loadPaymentMethods(): void {
    this.isLoadingMethods.set(true);
    this.expenseService
      .distinctPaymentMethods()
      .pipe(finalize(() => this.isLoadingMethods.set(false)))
      .subscribe({
        next: (methods) => this.availablePaymentMethods.set(methods ?? []),
        error: () => {
          /* silent */
        },
      });
  }
}
