import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Expense } from '../../../expense/models/expense.model';

@Component({
  selector: 'app-copy-expense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './copy-expense-dialog.component.html',
  styleUrl: './copy-expense-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyExpenseDialogComponent implements OnInit {
  readonly expense = input.required<Expense>();
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly confirmed = output<string>(); // ISO datetime
  readonly cancelled = output<void>();

  protected readonly when = signal<string>('');

  private readonly dateInputRef = viewChild<ElementRef<HTMLInputElement>>('dateInput');

  ngOnInit(): void {
    this.when.set(this.nowAsLocalInput());
    queueMicrotask(() => this.dateInputRef()?.nativeElement.focus());
  }

  protected onConfirm(): void {
    if (!this.when() || this.isLoading()) return;
    this.confirmed.emit(new Date(this.when()).toISOString());
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

  private nowAsLocalInput(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }
}
