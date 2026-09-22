import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  input,
  output,
  viewChild,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent implements OnInit {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');
  readonly variant = input<'danger' | 'default'>('default');
  readonly isLoading = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly confirmBtnRef = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');

  ngOnInit(): void {
    // Wait one tick for the button to render, then focus it.
    queueMicrotask(() => this.confirmBtnRef()?.nativeElement.focus());
  }

  protected onConfirm(): void {
    if (this.isLoading()) return;
    this.confirmed.emit();
  }

  protected onCancel(): void {
    if (this.isLoading()) return;
    this.cancelled.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.onCancel();
  }

  protected readonly confirmButtonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';

    return this.variant() === 'danger'
      ? `${base} bg-red-600 hover:bg-red-500 shadow-red-500/30`
      : `${base} bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-indigo-500/30`;
  });
}
