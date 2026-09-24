import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DataTransferService } from '../../services/data-transfer.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

const ACCEPTED_EXTENSIONS = ['.json.gz', '.gz'];
const ACCEPTED_MIME_TYPES = new Set([
  'application/gzip',
  'application/x-gzip',
  'application/x-gunzip',
  'application/gzipped',
  '', // Needed because OS/browsers often report file.type as "" for .json.gz
]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './data-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataImportComponent {
  private readonly transfer = inject(DataTransferService);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly isDragOver = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);

  protected readonly accept = ACCEPTED_EXTENSIONS.join(',');

  // ---- Drag & drop ----

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) this.considerFile(file);
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.considerFile(file);
    // Reset so the same file can be re-picked
    input.value = '';
  }

  // ---- File validation ----

  private considerFile(file: File): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    const extOk = ACCEPTED_EXTENSIONS.includes(ext);
    const mimeOk = !file.type || ACCEPTED_MIME_TYPES.has(file.type);

    if (!extOk || !mimeOk) {
      this.errorMessage.set(
        `Unsupported file type. Please upload a ${ACCEPTED_EXTENSIONS.join(' or ')} backup.`,
      );
      this.selectedFile.set(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      this.errorMessage.set('File is larger than 50 MB. Please contact support.');
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  protected clearFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set(null);
  }

  // ---- Submit flow ----

  protected requestImport(): void {
    if (!this.selectedFile()) return;
    this.confirmOpen.set(true);
  }

  protected closeConfirm(): void {
    if (this.isLoading()) return;
    this.confirmOpen.set(false);
  }

  protected onConfirmImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.transfer
      .importData(file)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.confirmOpen.set(false);
          this.successMessage.set(
            'Your backup has been imported. Refresh other tabs to see the latest data.',
          );
          this.selectedFile.set(null);
        },
        error: () => {
          this.confirmOpen.set(false);
          this.errorMessage.set(
            'Import failed. The file may be corrupted or from an incompatible version.',
          );
        },
      });
  }

  // ---- Template helpers ----

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
