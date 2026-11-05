import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import { MemberDto, SplitExpenseResponse, SplitType } from '../../models/splitwise.model';

@Component({
  selector: 'app-add-expense-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule], // Added FormsModule
  templateUrl: './add-expense-dialog.component.html',
  styleUrl: './add-expense-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly splitwiseService = inject(SplitwiseService);

  // Inputs
  readonly groupId = input.required<number>();
  readonly members = input.required<MemberDto[]>();
  readonly expenseToEdit = input<SplitExpenseResponse | null>(null);

  // Outputs
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly isEdit = computed(() => !!this.expenseToEdit());
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Expose Math to the template
  protected readonly Math = Math;

  // Form State
  protected readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paidByMemberId: [null as number | null, Validators.required],
    expenseDate: [this.nowAsLocalInput(), Validators.required],
    splitType: ['EQUAL' as SplitType, Validators.required],
  });

  protected readonly selectedMembers = signal<Set<number>>(new Set());
  protected readonly customAmounts = signal<Record<number, number>>({});
  protected readonly amount = signal<number | null>(null);

  protected readonly splitTypes = [
    { value: 'EQUAL', label: 'Equally' },
    { value: 'EXACT', label: 'Exact Amounts' },
    { value: 'PERCENTAGE', label: 'Percentages' },
  ];

  // Validation Computed
  protected readonly amountToDistribute = computed(() => this.amount() ?? 0);

  protected readonly currentDistributionSum = computed(() => {
    const type = this.form.controls.splitType.value;
    const selected = [...this.selectedMembers()];
    const amounts = this.customAmounts();

    if (type === 'EQUAL') return this.amountToDistribute();

    const sum = selected.reduce((acc, id) => acc + (amounts[id] || 0), 0);
    return Number(sum.toFixed(2));
  });

  // Calculate the difference so the UI can show what's left
  protected readonly remainingAmount = computed(() => {
    const type = this.form.controls.splitType.value;
    const target = type === 'PERCENTAGE' ? 100 : this.amountToDistribute();
    return Number((target - this.currentDistributionSum()).toFixed(2));
  });

  protected readonly isValidDistribution = computed(() => {
    const type = this.form.controls.splitType.value;
    if (type === 'EQUAL') return this.selectedMembers().size > 0;

    return Math.abs(this.remainingAmount()) < 0.05; // 5 paise tolerance
  });

  constructor() {
    this.form.controls.amount.valueChanges.subscribe((val) => {
      // 1. Update the signal so the math knows the new total
      this.amount.set(val);

      // 2. If they change the total amount while in EXACT/PERCENTAGE mode, re-balance
      if (this.form.controls.splitType.value !== 'EQUAL') {
        this.autoDistribute();
      }
    });

    this.form.controls.splitType.valueChanges.subscribe(() => {
      this.autoDistribute(); // Auto-fill when switching between Exact/Percentage
    });

    // Initialize or Pre-fill form
    effect(() => {
      const editExp = this.expenseToEdit();
      const allMembers = this.members();

      if (editExp) {
        // EDIT MODE
        this.form.patchValue({
          description: editExp.description,
          amount: editExp.amount,
          paidByMemberId: editExp.paidByMemberId,
          expenseDate: this.toLocalInput(editExp.expenseDate),
          splitType: 'EXACT',
        });
        this.amount.set(editExp.amount);

        const selected = new Set<number>();
        const amounts: Record<number, number> = {};

        editExp.shares.forEach((s) => {
          selected.add(s.memberId);
          amounts[s.memberId] = s.amount;
        });

        this.selectedMembers.set(selected);
        this.customAmounts.set(amounts);
      } else if (allMembers.length > 0 && this.selectedMembers().size === 0) {
        // CREATE MODE
        const selected = new Set<number>();
        allMembers.forEach((m) => selected.add(m.id));
        this.selectedMembers.set(selected);
        this.form.controls.paidByMemberId.setValue(allMembers[0].id);
      }
    });
  }

  protected toggleMember(memberId: number): void {
    this.selectedMembers.update((curr) => {
      const next = new Set(curr);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });

    this.autoDistribute();
  }

  protected isSelected(memberId: number): boolean {
    return this.selectedMembers().has(memberId);
  }

  // Just update the specific member's amount. Do not touch others.
  protected updateCustomAmount(memberId: number, value: number | null): void {
    const num = value || 0;
    this.customAmounts.update((c) => ({ ...c, [memberId]: num }));
  }

  // Equally distributes the total amount among selected members
  protected autoDistribute(): void {
    const type = this.form.controls.splitType.value;
    if (type === 'EQUAL') {
      this.customAmounts.set({});
      return;
    }

    const selected = [...this.selectedMembers()];
    if (selected.length === 0) return;

    const targetTotal = type === 'PERCENTAGE' ? 100 : this.amountToDistribute();
    const share = Number((targetTotal / selected.length).toFixed(2));

    const newAmounts: Record<number, number> = {};
    let currentSum = 0;

    selected.forEach((id, index) => {
      if (index === selected.length - 1) {
        newAmounts[id] = Number((targetTotal - currentSum).toFixed(2));
      } else {
        newAmounts[id] = share;
        currentSum += share;
      }
    });

    this.customAmounts.set(newAmounts);
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.isValidDistribution()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    const type = v.splitType;
    const selected = [...this.selectedMembers()];
    const custom = this.customAmounts();

    let shares = [];
    if (type === 'EQUAL') {
      shares = selected.map((id) => ({ memberId: id }));
    } else {
      shares = selected.map((id) => ({ memberId: id, amount: custom[id] || 0 }));
    }

    const payload = {
      description: v.description,
      amount: Number(v.amount),
      paidByMemberId: Number(v.paidByMemberId),
      expenseDate: new Date(v.expenseDate).toISOString(),
      splitType: type,
      shares: shares,
    };

    const req$ = this.isEdit()
      ? this.splitwiseService.updateExpense(this.groupId(), this.expenseToEdit()!.id, payload)
      : this.splitwiseService.addExpense(this.groupId(), payload);

    req$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => this.saved.emit(),
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to save expense.'),
    });
  }

  private nowAsLocalInput(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
