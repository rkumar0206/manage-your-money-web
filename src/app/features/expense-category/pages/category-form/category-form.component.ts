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
import { ExpenseCategory } from '../../models/expense-category.model';
import { ExpenseCategoryService } from '../../services/expense-category.service';
import { ImagePickerComponent } from '../../../shared/components/image-picker/image-picker.component';

type Mode = 'create' | 'edit';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ImagePickerComponent],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly categoryService = inject(ExpenseCategoryService);

  /** Route param — present only in edit mode. */
  readonly id = input<string | undefined>(undefined);

  protected readonly mode = computed<Mode>(() => (this.id() ? 'edit' : 'create'));
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly isLoading = signal(false); // submit in-flight
  protected readonly isPrefetching = signal(false); // fetching existing category in edit mode
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly previewOpen = signal(false); // mobile-only toggle
  protected readonly pickerOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(255)]],
    imageUrl: ['', [Validators.maxLength(255)]],
  });

  protected get name() {
    return this.form.controls.name;
  }
  protected get description() {
    return this.form.controls.description;
  }
  protected get imageUrl() {
    return this.form.controls.imageUrl;
  }

  /** Live form value as a signal — drives the preview card. */
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly preview = computed(() => {
    const v = this.formValue();
    return {
      name: v.name?.trim() || 'Category name',
      description: v.description?.trim() || null,
      imageUrl: v.imageUrl?.trim() || null,
    };
  });

  constructor() {
    // In edit mode: fetch the category and patch the form.
    effect(() => {
      const editId = this.id();
      if (!editId) return;

      this.isPrefetching.set(true);
      this.errorMessage.set(null);

      this.categoryService
        .getById(Number(editId))
        .pipe(finalize(() => this.isPrefetching.set(false)))
        .subscribe({
          next: (category) => {
            this.form.patchValue({
              name: category.name ?? '',
              description: category.description ?? '',
              imageUrl: category.imageUrl ?? '',
            });
          },
          error: () => {
            this.errorMessage.set('Could not load this category.');
          },
        });
    });
  }

  protected togglePreview(): void {
    this.previewOpen.update((v) => !v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      description: value.description?.trim() || null,
      imageUrl: value.imageUrl?.trim() || null,
    };

    const request$ = this.isEdit()
      ? this.categoryService.update(Number(this.id()), {
          ...payload,
          isSynced: false,
        })
      : this.categoryService.create(payload);

    request$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => this.router.navigate(['/categories']),
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(
          err?.error?.message ?? 'Could not save the category. Please try again.',
        );
      },
    });
  }

  protected onCancel(): void {
    this.router.navigate(['/categories']);
  }

  protected formatCurrencyPreview(value = 0): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected openImagePicker(): void {
    this.pickerOpen.set(true);
  }

  protected closeImagePicker(): void {
    this.pickerOpen.set(false);
  }

  protected onImagePicked(url: string): void {
    this.form.controls.imageUrl.setValue(url);
    this.form.controls.imageUrl.markAsDirty();
    this.pickerOpen.set(false);
  }
}
