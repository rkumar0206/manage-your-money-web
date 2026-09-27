import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryName } from '../../../expense-category/models/expense-category.model';
import { Expense } from '../../../expense/models/expense.model';

@Component({
  selector: 'app-move-expense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './move-expense-dialog.component.html',
  styleUrl: './move-expense-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveExpenseDialogComponent implements OnInit {
  readonly expense = input.required<Expense>();
  readonly categories = input.required<CategoryName[]>();
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly confirmed = output<number>(); // new categoryId
  readonly cancelled = output<void>();

  protected readonly selectedCategoryId = signal<number | null>(null);

  protected readonly hasChanged = computed(
    () =>
      this.selectedCategoryId() != null && this.selectedCategoryId() !== this.expense().categoryId,
  );

  protected readonly targetCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (id == null) return '';
    return this.categories().find((c) => c.id === id)?.name ?? '';
  });

  private readonly selectRef = viewChild<ElementRef<HTMLSelectElement>>('selectEl');

  ngOnInit(): void {
    queueMicrotask(() => this.selectRef()?.nativeElement.focus());
  }

  protected onConfirm(): void {
    const id = this.selectedCategoryId();
    if (id == null || !this.hasChanged() || this.isLoading()) return;
    this.confirmed.emit(id);
  }

  protected onCancel(): void {
    if (this.isLoading()) return;
    this.cancelled.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.onCancel();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.onCancel();
  }

  protected formatCurrency(v: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v) || 0);
  }
}
