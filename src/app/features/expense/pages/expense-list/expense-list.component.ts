import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
  viewChild,
  effect,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import {
  AMOUNT_OPERATORS,
  AmountFilterOperator,
  DEFAULT_PILL_CLASS,
  DATE_RANGE_PRESETS,
  DateRangePreset,
  Expense,
  ExpenseSearchRequest,
  PAYMENT_METHOD_MAP,
} from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseCategoryService } from '../../../expense-category/services/expense-category.service';
import { ExpenseCategory } from '../../../expense-category/models/expense-category.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseListComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(ExpenseCategoryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  /** ?categoryId= (query param binding). */
  readonly categoryId = input<string | undefined>(undefined);

  // ===========================================================================
  // Data
  // ===========================================================================

  protected readonly expenses = signal<Expense[]>([]);
  protected readonly categories = signal<ExpenseCategory[]>([]);
  protected readonly availablePaymentMethods = signal<string[]>([]);

  protected readonly isLoading = signal(true);
  protected readonly isLoadingMore = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // ---- Server aggregates ----
  protected readonly serverTotal = signal<number | null>(null);
  protected readonly serverCount = signal<number | null>(null);
  protected readonly isLoadingTotal = signal(false);

  // ---- Pagination ----
  private readonly currentPage = signal(0);
  protected readonly hasMore = signal(true);

  // ===========================================================================
  // Filter state
  // ===========================================================================

  protected readonly searchTerm = signal('');
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly selectedPaymentMethods = signal<ReadonlySet<string>>(new Set());

  protected readonly amountOperator = signal<AmountFilterOperator | null>(null);
  protected readonly amount = signal<number | null>(null);
  protected readonly amountTo = signal<number | null>(null);

  protected readonly dateRangePreset = signal<DateRangePreset>('ALL_TIME');
  protected readonly createdFrom = signal(''); // datetime-local string
  protected readonly createdTo = signal('');

  /** UI-only toggle for the advanced filter panel. */
  protected readonly advancedOpen = signal(false);

  protected readonly amountOperators = AMOUNT_OPERATORS;
  protected readonly dateRangePresets = DATE_RANGE_PRESETS;

  // ===========================================================================
  // Delete / menu
  // ===========================================================================

  protected readonly deleteTarget = signal<Expense | null>(null);
  protected readonly deleteLoading = signal(false);
  protected readonly openMenuId = signal<number | null>(null);

  // ===========================================================================
  // Infinite scroll
  // ===========================================================================

  private readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer: IntersectionObserver | null = null;

  // ===========================================================================
  // Derived — filter criteria, active-filter count, labels
  // ===========================================================================

  /** Builds the criteria object sent to the backend. Strips empty values. */
  protected readonly criteria = computed<ExpenseSearchRequest>(() => {
    const c: ExpenseSearchRequest = {};

    const term = this.searchTerm().trim();
    if (term) c.spentOn = term;

    const catId = this.selectedCategoryId();
    if (catId != null) c.categoryId = catId;

    const methods = [...this.selectedPaymentMethods()];
    if (methods.length > 0) c.paymentMethods = methods;

    const op = this.amountOperator();
    const amt = this.amount();
    if (op && amt != null) {
      c.amountOperator = op;
      c.amount = amt;
      if (op === 'IS_BETWEEN') {
        const to = this.amountTo();
        if (to != null) c.amountTo = to;
      }
    }

    const preset = this.dateRangePreset();
    if (preset && preset !== 'ALL_TIME') {
      c.dateRangePreset = preset;
    } else {
      const from = this.createdFrom();
      const to = this.createdTo();
      if (from) c.createdFrom = new Date(from).toISOString();
      if (to) c.createdTo = new Date(to).toISOString();
    }

    return c;
  });

  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.searchTerm().trim()) n++;
    if (this.selectedCategoryId() != null) n++;
    if (this.selectedPaymentMethods().size > 0) n++;
    if (this.amountOperator() && this.amount() != null) n++;
    const preset = this.dateRangePreset();
    if (preset && preset !== 'ALL_TIME') n++;
    else if (this.createdFrom() || this.createdTo()) n++;
    return n;
  });

  protected readonly hasAnyFilter = computed(() => this.activeFilterCount() > 0);

  protected readonly activeCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (id == null) return null;
    return this.categories().find((c) => c.id === id)?.name ?? `#${id}`;
  });

  protected readonly totalLabel = computed(() =>
    this.activeCategoryName() ? `Total in ${this.activeCategoryName()}` : 'Total spent',
  );

  protected readonly showAmountTo = computed(() => this.amountOperator() === 'IS_BETWEEN');

  protected readonly showCustomRange = computed(() => {
    const p = this.dateRangePreset();
    return p === 'ALL_TIME';
  });

  protected readonly deleteMessage = computed(() => {
    const e = this.deleteTarget();
    if (!e) return '';
    const label = e.spentOn?.trim() || e.categoryName || 'this expense';
    return `${label} (${this.formatCurrency(e.amount)}) will be permanently removed. This action cannot be undone.`;
  });

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  constructor() {
    // URL → filter: apply the query param ONLY when present.
    // A missing param is a no-op so the dropdown remains the source of
    // truth after the initial deep-link. Reads of selectedCategoryId are
    // untracked so this effect does not re-run on dropdown changes.
    effect(() => {
      const qp = this.categoryId(); // ← only reactive dep
      untracked(() => {
        if (qp == null) return;
        const parsed = Number(qp);
        if (!Number.isNaN(parsed) && parsed !== this.selectedCategoryId()) {
          this.selectedCategoryId.set(parsed);
        }
      });
    });

    this.loadCategories();
    this.loadPaymentMethods();

    // Reload whenever the criteria changes (debounced for text inputs).
    toObservable(this.criteria)
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadFirstPage());

    // Infinite-scroll observer.
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      this.observer?.disconnect();
      this.observer = null;
      if (!el) return;

      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.loadMore();
        },
        { rootMargin: '300px 0px' },
      );
      this.observer.observe(el);

      onCleanup(() => this.observer?.disconnect());
    });

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  // ===========================================================================
  // Data loading
  // ===========================================================================

  protected loadFirstPage(): void {
    this.currentPage.set(0);
    this.expenses.set([]);
    this.hasMore.set(true);

    const snapshot = this.criteria();
    this.loadPage(0, snapshot, true);
    this.loadTotal(snapshot);
  }

  private loadPage(page: number, criteria: ExpenseSearchRequest, first: boolean): void {
    if (first) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    } else {
      this.isLoadingMore.set(true);
    }

    this.expenseService
      .search(criteria, page)
      .pipe(
        finalize(() => {
          if (first) this.isLoading.set(false);
          else this.isLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          // Drop if criteria changed mid-flight.
          if (JSON.stringify(this.criteria()) !== JSON.stringify(criteria)) return;

          this.expenses.update((curr) =>
            first ? (res.content ?? []) : [...curr, ...(res.content ?? [])],
          );
          this.currentPage.set(page);
          this.hasMore.set(!res.last);

          if (first) this.serverCount.set(res.totalElements ?? 0);
        },
        error: () => {
          this.errorMessage.set('Could not load expenses. Please try again.');
          this.hasMore.set(false);
        },
      });
  }

  private loadTotal(criteria: ExpenseSearchRequest): void {
    this.isLoadingTotal.set(true);
    this.expenseService
      .searchTotal(criteria)
      .pipe(finalize(() => this.isLoadingTotal.set(false)))
      .subscribe({
        next: (total) => {
          if (JSON.stringify(this.criteria()) !== JSON.stringify(criteria)) return;
          this.serverTotal.set(Number(total) || 0);
        },
        error: () => {
          if (JSON.stringify(this.criteria()) !== JSON.stringify(criteria)) return;
          this.serverTotal.set(null);
        },
      });
  }

  protected loadMore(): void {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;
    this.loadPage(this.currentPage() + 1, this.criteria(), false);
  }

  protected reload(): void {
    this.loadFirstPage();
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (data) => this.categories.set(data ?? []),
      error: () => {
        /* silent */
      },
    });
  }

  private loadPaymentMethods(): void {
    this.expenseService.distinctPaymentMethods().subscribe({
      next: (methods) => this.availablePaymentMethods.set(methods.methods ?? []),
      error: () => {
        /* silent */
      },
    });
  }

  // ===========================================================================
  // Filter mutations
  // ===========================================================================

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  protected onCategoryChange(value: string): void {
    const parsed = value === '' ? null : Number(value);
    const next = parsed != null && !Number.isNaN(parsed) ? parsed : null;

    if (this.selectedCategoryId() === next) return;

    this.selectedCategoryId.set(next);
    this.stripCategoryIdFromUrl();
  }

  protected togglePaymentFilter(method: string): void {
    this.selectedPaymentMethods.update((curr) => {
      const next = new Set(curr);
      next.has(method) ? next.delete(method) : next.add(method);
      return next;
    });
  }

  protected isPaymentSelected(method: string): boolean {
    return this.selectedPaymentMethods().has(method);
  }

  protected onAmountOperatorChange(value: string): void {
    const op = (value || null) as AmountFilterOperator | null;
    this.amountOperator.set(op);
    if (op !== 'IS_BETWEEN') this.amountTo.set(null);
    if (!op) this.amount.set(null);
  }

  protected onAmountInput(value: string): void {
    const n = value === '' ? null : Number(value);
    this.amount.set(n != null && !Number.isNaN(n) ? n : null);
  }

  protected onAmountToInput(value: string): void {
    const n = value === '' ? null : Number(value);
    this.amountTo.set(n != null && !Number.isNaN(n) ? n : null);
  }

  protected onDateRangePresetChange(value: string): void {
    this.dateRangePreset.set(value as DateRangePreset);
    if (value !== 'ALL_TIME' && value !== 'CUSTOM') {
      this.createdFrom.set('');
      this.createdTo.set('');
    }
  }

  protected onCreatedFromChange(value: string): void {
    this.createdFrom.set(value);
  }

  protected onCreatedToChange(value: string): void {
    this.createdTo.set(value);
  }

  protected toggleAdvanced(): void {
    this.advancedOpen.update((v) => !v);
  }

  protected clearAllFilters(): void {
    this.searchTerm.set('');
    this.selectedCategoryId.set(null);
    this.selectedPaymentMethods.set(new Set());
    this.amountOperator.set(null);
    this.amount.set(null);
    this.amountTo.set(null);
    this.dateRangePreset.set('ALL_TIME');
    this.createdFrom.set('');
    this.createdTo.set('');

    this.stripCategoryIdFromUrl();
  }

  // ===========================================================================
  // Overflow menu
  // ===========================================================================

  protected toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.openMenuId.update((cur) => (cur === id ? null : id));
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-card-menu]')) this.openMenuId.set(null);
  }

  // ===========================================================================
  // Delete
  // ===========================================================================

  protected requestDelete(expense: Expense, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.openMenuId.set(null);
    this.deleteTarget.set(expense);
  }

  protected cancelDelete(): void {
    if (this.deleteLoading()) return;
    this.deleteTarget.set(null);
  }

  protected onConfirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleteLoading.set(true);
    this.expenseService
      .remove(target.id)
      .pipe(finalize(() => this.deleteLoading.set(false)))
      .subscribe({
        next: () => {
          this.expenses.update((list) => list.filter((e) => e.id !== target.id));
          this.deleteTarget.set(null);
          // Refresh aggregate from server — keeps everything authoritative.
          this.loadTotal(this.criteria());
          this.serverCount.update((c) => (c == null ? null : Math.max(0, c - 1)));
        },
        error: () => {
          this.errorMessage.set('Could not delete the expense. Please try again.');
          this.deleteTarget.set(null);
        },
      });
  }

  // ===========================================================================
  // Template helpers
  // ===========================================================================

  protected trackById = (_: number, item: Expense): number => item.id;

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  protected formatCount(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
  }

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }

  protected methodLabel(method: string): string {
    return PAYMENT_METHOD_MAP.get(method)?.label ?? method.replace(/_/g, ' ');
  }

  protected pillClassFor(method: string): string {
    const base =
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap';
    const color = PAYMENT_METHOD_MAP.get(method)?.pillClass ?? DEFAULT_PILL_CLASS;
    return `${base} ${color}`;
  }

  protected methodColorClasses(method: string): string {
    return PAYMENT_METHOD_MAP.get(method)?.pillClass ?? DEFAULT_PILL_CLASS;
  }

  protected goToNewExpense(): void {
    const cat = this.selectedCategoryId();
    this.router.navigate(['/expenses', 'new'], {
      queryParams: cat != null ? { categoryId: cat } : undefined,
    });
  }

  /**
   * Removes ?categoryId from the URL without adding a history entry.
   * Called after the user interacts with the dropdown so the URL
   * no longer carries the deep-link param.
   */
  private stripCategoryIdFromUrl(): void {
    if (this.categoryId() == null) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
