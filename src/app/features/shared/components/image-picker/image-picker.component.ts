import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ImageService } from '../../services/image.service';
import { UnsplashUrls } from '../../models/image.model';

const PAGE_LIMIT = 12;

@Component({
  selector: 'app-image-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-picker.component.html',
  styleUrl: './image-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagePickerComponent implements OnInit {
  private readonly imageService = inject(ImageService);

  /** Emits the `regular` URL of the picked image. */
  readonly selected = output<string>();
  readonly cancelled = output<void>();

  protected readonly keyword = signal('');
  protected readonly submitted = signal('');
  protected readonly results = signal<UnsplashUrls[]>([]);
  protected readonly page = signal(1);
  protected readonly hasMore = signal(true);

  protected readonly isLoading = signal(false);
  protected readonly isLoadingMore = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly picked = signal<UnsplashUrls | null>(null);

  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  ngOnInit(): void {
    // Focus the search field once the dialog mounts.
    queueMicrotask(() => this.searchInputRef()?.nativeElement.focus());
  }

  protected onKeywordInput(value: string): void {
    this.keyword.set(value);
  }

  protected onSearchSubmit(event?: Event): void {
    event?.preventDefault();
    const term = this.keyword().trim();
    if (!term) return;

    this.submitted.set(term);
    this.page.set(1);
    this.results.set([]);
    this.hasMore.set(true);
    this.loadPage(1);
  }

  private loadPage(page: number): void {
    const term = this.submitted();
    if (!term) return;

    if (page === 1) this.isLoading.set(true);
    else this.isLoadingMore.set(true);
    this.errorMessage.set(null);

    this.imageService
      .search(term, page, PAGE_LIMIT)
      .pipe(
        finalize(() => {
          if (page === 1) this.isLoading.set(false);
          else this.isLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const batch = response.urls ?? [];
          this.results.update((curr) => (page === 1 ? batch : [...curr, ...batch]));
          this.page.set(page);
          // If the batch is smaller than the limit, we've hit the end.
          this.hasMore.set(batch.length === PAGE_LIMIT);
        },
        error: () => {
          this.errorMessage.set('Could not fetch images. Please try again.');
          this.hasMore.set(false);
        },
      });
  }

  protected loadMore(): void {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;
    this.loadPage(this.page() + 1);
  }

  protected pick(image: UnsplashUrls): void {
    this.picked.set(image);
  }

  protected confirmPick(): void {
    const img = this.picked();
    if (!img) return;
    this.selected.emit(img.regular);
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.onCancel();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.onCancel();
  }
}
