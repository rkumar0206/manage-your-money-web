import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import { GroupResponse } from '../../models/splitwise.model';

@Component({
  selector: 'app-edit-group-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-dialog-backdrop sm:items-center sm:p-4"
      (click)="cancelled.emit()"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl animate-dialog-panel"
        (click)="$event.stopPropagation()"
      >
        <header class="border-b border-slate-200/60 px-5 py-4">
          <h2 class="text-lg font-bold text-slate-900">Edit Group Details</h2>
        </header>

        <div class="p-5">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Group Name</label>
              <input
                type="text"
                formControlName="name"
                class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Description</label>
              <input
                type="text"
                formControlName="description"
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
            {{ isLoading() ? 'Saving...' : 'Save Changes' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly splitwiseService = inject(SplitwiseService);

  readonly group = input.required<GroupResponse>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  constructor() {
    // Pre-fill form
    setTimeout(() => {
      this.form.patchValue({
        name: this.group().name,
        description: this.group().description || '',
      });
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const v = this.form.getRawValue();

    this.splitwiseService
      .updateGroup(this.group().id, {
        name: v.name.trim(),
        description: v.description.trim() || undefined,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.saved.emit(),
        error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to update group.'),
      });
  }
}
