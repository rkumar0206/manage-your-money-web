import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
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
import { DashboardFilterStore } from '../../stores/dashboard-filter.store';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

const MIN_YEAR = 2018;
const DASHBOARD_PRESETS = DATE_RANGE_PRESETS;

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
  private readonly filterStore = inject(DashboardFilterStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly dateRangePreset = this.filterStore.dateRangePreset;
  protected readonly selectedYear = this.filterStore.selectedYear;
  protected readonly paymentMethods = this.filterStore.paymentMethods;

  protected readonly selectedPaymentMethods = this.filterStore.paymentMethods;

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
    paymentMethods: [...this.selectedPaymentMethods()],
    year: this.selectedYear(),
  }));

  constructor() {
    this.seedFromUrl(this.route.snapshot.queryParamMap);
    this.loadPaymentMethods();

    // Mirror filter state to URL whenever any of the three changes.
    effect(() => {
      const preset = this.dateRangePreset();
      const year = this.selectedYear();
      const pm = [...this.selectedPaymentMethods()];

      untracked(() => this.syncUrl(preset, year, pm));
    });
  }

  private seedFromUrl(params: ParamMap): void {
    const preset = params.get('preset') as DateRangePreset | null;
    if (preset != null && this.presets.some((p) => p.value === preset)) {
      this.dateRangePreset.set(preset);
    }

    const year = Number(params.get('year'));
    if (!Number.isNaN(year) && year >= 2018 && year <= new Date().getFullYear()) {
      this.selectedYear.set(year);
    }

    const pm = params.get('pm');
    if (pm != null) {
      this.selectedPaymentMethods.set(new Set(pm.split(',').filter(Boolean)));
    }
  }

  private syncUrl(preset: DateRangePreset, year: number, paymentMethods: string[]): void {
    const desired: Record<string, string | null> = {
      preset: preset !== 'THIS_YEAR' ? preset : null,
      year: year !== new Date().getFullYear() ? String(year) : null,
      pm: paymentMethods.length ? paymentMethods.join(',') : null,
    };

    const current = this.route.snapshot.queryParamMap;
    let changed = false;
    for (const key of Object.keys(desired)) {
      if ((current.get(key) ?? null) !== desired[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: desired,
      replaceUrl: true,
    });
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
    this.selectedPaymentMethods.update((curr) => {
      const next = new Set(curr);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  protected isPaymentSelected(m: string): boolean {
    return this.selectedPaymentMethods().has(m);
  }

  protected clearPaymentMethods(): void {
    this.selectedPaymentMethods.set(new Set());
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
        next: (methods) => this.availablePaymentMethods.set(methods.methods ?? []),
        error: () => {
          /* silent */
        },
      });
  }
}
