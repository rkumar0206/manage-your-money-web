import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DataTransferService } from '../../services/data-transfer.service';

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './data-export.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly transfer = inject(DataTransferService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly isLoading = signal(false);
  protected readonly submittedEmail = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected get email() {
    return this.form.controls.email;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue().email.trim();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.transfer
      .requestExport(value)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.submittedEmail.set(value),
        error: () =>
          this.errorMessage.set('Could not request the export. Please try again in a moment.'),
      });
  }

  protected reset(): void {
    this.submittedEmail.set(null);
    this.errorMessage.set(null);
    this.form.reset({ email: '' });
  }
}
