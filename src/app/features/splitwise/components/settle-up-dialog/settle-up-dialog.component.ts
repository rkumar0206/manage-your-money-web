import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import { SettlementTransaction } from '../../models/splitwise.model';

@Component({
  selector: 'app-settle-up-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-dialog-backdrop sm:items-center sm:p-4"
      (click)="cancelled.emit()"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl animate-dialog-panel sm:rounded-3xl"
        (click)="$event.stopPropagation()"
      >
        <header class="border-b border-slate-200/60 px-5 py-4">
          <h2 class="text-lg font-bold text-slate-900">Record a Settlement</h2>
          <p class="text-xs text-slate-500 mt-1">Record a payment made outside the app.</p>
        </header>

        <div class="p-5">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div
              class="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4"
            >
              <div class="text-center flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Paid By
                </p>
                <p class="font-bold text-slate-900">{{ transaction().fromName }}</p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-slate-400 mx-2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
              <div class="text-center flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Paid To
                </p>
                <p class="font-bold text-slate-900">{{ transaction().toName }}</p>
              </div>
            </div>

            <div class="group">
              <label class="mb-1 block text-xs font-semibold text-slate-700">Amount (₹)</label>
              <input
                type="number"
                formControlName="amount"
                step="0.01"
                class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-lg font-bold text-indigo-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div class="group">
              <label class="mb-1 block text-xs font-semibold text-slate-700">Date</label>
              <input
                type="datetime-local"
                formControlName="settlementDate"
                class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </form>
          @if (errorMessage()) {
            <p class="mt-2 text-xs text-red-600">{{ errorMessage() }}</p>
          }
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200/60 bg-slate-50 p-4">
          <button
            (click)="cancelled.emit()"
            class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            (click)="onSubmit()"
            [disabled]="isLoading() || form.invalid"
            class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ isLoading() ? 'Recording...' : 'Record Payment' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettleUpDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly splitwiseService = inject(SplitwiseService);

  readonly groupId = input.required<number>();
  readonly transaction = input.required<SettlementTransaction>();

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    settlementDate: [this.nowAsLocalInput(), Validators.required],
  });

  constructor() {
    // Pre-fill the amount with the suggested settlement amount
    setTimeout(() => {
      this.form.patchValue({ amount: this.transaction().amount });
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);

    const payload = {
      paidByMemberId: this.transaction().fromMemberId,
      paidToMemberId: this.transaction().toMemberId,
      amount: Number(this.form.value.amount),
      settlementDate: new Date(this.form.value.settlementDate!).toISOString(),
    };

    this.splitwiseService
      .addSettlement(this.groupId(), payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.saved.emit(),
        error: (err) =>
          this.errorMessage.set(err?.error?.message || 'Failed to record settlement.'),
      });
  }

  private nowAsLocalInput(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
