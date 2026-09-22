import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, startWith } from 'rxjs';
import {
  DEFAULT_PILL_CLASS,
  Expense,
  PAYMENT_METHODS,
  PaymentMethodOption,
} from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseCategoryService } from '../../../expense-category/services/expense-category.service';
import { ExpenseCategory } from '../../../expense-category/models/expense-category.model';

type Mode = 'create' | 'edit';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(ExpenseCategoryService);

  readonly id = input<string | undefined>(undefined);
  readonly categoryId = input<string | undefined>(undefined);

  protected readonly mode = computed<Mode>(() => (this.id() ? 'edit' : 'create'));
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly isLoading = signal(false);
  protected readonly isPrefetching = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly categories = signal<ExpenseCategory[]>([]);

  /** Payment methods the user has already used (from backend). */
  private readonly historyMethods = signal<string[]>([]);

  /** Custom methods added during this session only. */
  private readonly customMethods = signal<string[]>([]);

  /** Text typed into the "add custom method" input. */
  protected readonly newMethodInput = signal('');

  protected readonly form = this.fb.group({
    spentOn: ['', [Validators.maxLength(500)]],
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    categoryId: [null as number | null, [Validators.required]],
    paymentMethods: [[] as string[]],
    created: [''],
  });

  protected get spentOn() {
    return this.form.controls.spentOn;
  }
  protected get amount() {
    return this.form.controls.amount;
  }
  protected get categoryIdControl() {
    return this.form.controls.categoryId;
  }

  private readonly selectedMethods = toSignal(
    this.form.controls.paymentMethods.valueChanges.pipe(
      startWith(this.form.controls.paymentMethods.value ?? []),
    ),
    { initialValue: [] as string[] },
  );

  private readonly liveAmount = toSignal(
    this.form.controls.amount.valueChanges.pipe(startWith(this.form.controls.amount.value)),
    { initialValue: null as number | null },
  );

  private readonly liveCategoryId = toSignal(
    this.form.controls.categoryId.valueChanges.pipe(startWith(this.form.controls.categoryId.value)),
    { initialValue: null as number | null },
  );

  protected readonly preview = computed(() => {
    const catId = this.liveCategoryId();
    const cat = this.categories().find((c) => c.id === catId);
    return {
      categoryName: cat?.name ?? 'Category',
      imageUrl: cat?.imageUrl ?? null,
      amount: this.liveAmount() ?? 0,
      methods: this.selectedMethods() ?? [],
    };
  });

  /**
   * All selectable methods:
   *   predefined (PAYMENT_METHODS)
   *   + user's history from backend
   *   + custom ones added this session
   *   + anything currently selected on the form (safety net for edit)
   * Deduplicated, order preserved.
   */
  protected readonly allMethodOptions = computed<PaymentMethodOption[]>(() => {
    const predefined = new Map<string, PaymentMethodOption>(
      PAYMENT_METHODS.map((m) => [m.value, m]),
    );
    const result = new Map<string, PaymentMethodOption>(predefined);

    const add = (value: string) => {
      if (!value) return;
      if (!result.has(value)) {
        result.set(value, {
          value,
          label: value,
          pillClass: DEFAULT_PILL_CLASS,
        });
      }
    };

    for (const m of this.historyMethods()) add(m);
    for (const m of this.customMethods()) add(m);
    for (const m of this.form.controls.paymentMethods.value ?? []) add(m);

    return [...result.values()];
  });

  constructor() {
    this.loadCategories();
    this.loadDistinctMethods();

    // Edit mode: fetch and prefill.
    effect(() => {
      const editId = this.id();
      if (!editId) return;

      this.isPrefetching.set(true);
      this.errorMessage.set(null);

      this.expenseService
        .getById(Number(editId))
        .pipe(finalize(() => this.isPrefetching.set(false)))
        .subscribe({
          next: (e) => this.prefill(e),
          error: () => this.errorMessage.set('Could not load this expense.'),
        });
    });

    // Create mode: apply categoryId query param once.
    effect(() => {
      const qp = this.categoryId();
      if (this.isEdit() || !qp) return;
      const parsed = Number(qp);
      if (!Number.isNaN(parsed) && this.form.controls.categoryId.value == null) {
        this.form.controls.categoryId.setValue(parsed);
      }
    });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (data) => this.categories.set(data ?? []),
      error: () => this.errorMessage.set('Could not load categories.'),
    });
  }

  private loadDistinctMethods(): void {
    this.expenseService.distinctPaymentMethods().subscribe({
      next: (methods) => this.historyMethods.set(methods ?? []),
      error: () => {
        /* non-critical */
      },
    });
  }

  private prefill(e: Expense): void {
    this.form.patchValue({
      spentOn: e.spentOn ?? '',
      amount: Number(e.amount),
      categoryId: e.categoryId,
      paymentMethods: e.paymentMethods ?? [],
      created: e.created ? this.toLocalInput(e.created) : '',
    });
  }

  // ---------------------------------------------------------------------------
  // Payment method interaction
  // ---------------------------------------------------------------------------

  protected isMethodSelected(method: string): boolean {
    return (this.form.controls.paymentMethods.value ?? []).includes(method);
  }

  protected toggleMethod(method: string): void {
    const ctrl = this.form.controls.paymentMethods;
    const current = ctrl.value ?? [];
    ctrl.setValue(
      current.includes(method) ? current.filter((m) => m !== method) : [...current, method],
    );
    ctrl.markAsDirty();
  }

  protected onNewMethodInput(value: string): void {
    this.newMethodInput.set(value);
  }

  /** Add a custom method from the text input; select it immediately. */
  protected addCustomMethod(event?: Event): void {
    event?.preventDefault();
    const raw = this.newMethodInput().trim();
    if (!raw) return;

    const normalized = raw.toUpperCase().replace(/\s+/g, '_');

    // Already exists → just select it.
    this.customMethods.update((list) => (list.includes(normalized) ? list : [...list, normalized]));
    if (!this.isMethodSelected(normalized)) this.toggleMethod(normalized);

    this.newMethodInput.set('');
  }

  protected onCustomMethodKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomMethod();
    }
  }

  protected methodLabel(method: string): string {
    // Prefer the pretty label from PAYMENT_METHODS if available.
    const known = PAYMENT_METHODS.find((m) => m.value === method);
    return known?.label ?? method.replace(/_/g, ' ');
  }

  protected methodColorClasses(method: string): string {
    const known = PAYMENT_METHODS.find((m) => m.value === method);
    return known?.pillClass ?? DEFAULT_PILL_CLASS;
  }

  protected pillClassFor(method: string): string {
    const base =
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap';
    return `${base} ${this.methodColorClasses(method)}`;
  }

  // ---------------------------------------------------------------------------
  // Submit / cancel
  // ---------------------------------------------------------------------------

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    const payload = {
      spentOn: v.spentOn?.trim() || null,
      amount: Number(v.amount),
      categoryId: Number(v.categoryId),
      paymentMethods: v.paymentMethods ?? [],
      created: v.created ? new Date(v.created).toISOString() : undefined,
    };

    const request$ = this.isEdit()
      ? this.expenseService.update(Number(this.id()), payload)
      : this.expenseService.create(payload);

    request$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => this.returnToExpenses(),
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(
          err?.error?.message ?? 'Could not save the expense. Please try again.',
        );
      },
    });
  }

  protected onCancel(): void {
    this.returnToExpenses();
  }

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /**
   * Navigate back to the expense list, restoring the ?categoryId filter
   * that was active when the user entered the form.
   */
  private returnToExpenses(): void {
    const cat = this.categoryId();
    const queryParams = cat != null && cat !== '' ? { categoryId: cat } : undefined;

    void this.router.navigate(['/expenses'], { queryParams });
  }
}
