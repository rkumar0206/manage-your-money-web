import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ExpenseCategory } from '../../models/expense-category.model';
import { ExpenseCategoryService } from '../../services/expense-category.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CategoryFilterStore } from '../../stores/category-filter.store';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialogComponent, FormsModule],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
  private readonly categoryService = inject(ExpenseCategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly filterStore = inject(CategoryFilterStore);
  protected readonly searchTerm = this.filterStore.searchTerm;

  protected readonly categories = signal<ExpenseCategory[]>([]);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly openMenuId = signal<number | null>(null);
  protected readonly deleteTarget = signal<ExpenseCategory | null>(null);
  protected readonly deleteLoading = signal(false);

  protected readonly hasCategories = computed(() => this.categories().length > 0);

  protected readonly deleteMessage = computed(() => {
    const c = this.deleteTarget();
    return c ? `"${c.name}" will be permanently removed. This action cannot be undone.` : '';
  });

  constructor() {
    this.seedFromUrl(this.route.snapshot.queryParamMap);

    toObservable(this.searchTerm)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.fetchCategories();
        this.syncUrlFromSearch(term);
      });
  }

  // ---------------------------------------------------------------------------

  private seedFromUrl(params: ParamMap): void {
    const q = params.get('q');
    if (q != null) this.searchTerm.set(q);
  }

  private syncUrlFromSearch(term: string): void {
    const current = this.route.snapshot.queryParamMap.get('q') ?? null;
    const desired = term.trim() || null;
    if (current === desired) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: desired },
      replaceUrl: true,
    });
  }

  private fetchCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const term = this.searchTerm().trim();
    const request$ = term ? this.categoryService.search(term) : this.categoryService.list();

    request$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (data) => this.categories.set(data ?? []),
      error: () => {
        this.errorMessage.set('Could not load categories. Please try again.');
      },
    });
  }

  protected loadCategories(): void {
    this.fetchCategories();
  }

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  protected clearSearch(): void {
    this.filterStore.reset();
  }

  // ---------------------------------------------------------------------------

  protected trackById = (_: number, item: ExpenseCategory): number => item.id;

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  // ---------------------------------------------------------------------------

  protected toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.openMenuId.update((cur) => (cur === id ? null : id));
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-card-menu]')) this.openMenuId.set(null);
  }

  // ---------------------------------------------------------------------------

  protected requestDelete(category: ExpenseCategory, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.openMenuId.set(null);
    this.deleteTarget.set(category);
  }

  protected cancelDelete(): void {
    if (this.deleteLoading()) return;
    this.deleteTarget.set(null);
  }

  protected onConfirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleteLoading.set(true);
    this.categoryService
      .remove(target.id)
      .pipe(finalize(() => this.deleteLoading.set(false)))
      .subscribe({
        next: () => {
          this.categories.update((list) => list.filter((c) => c.id !== target.id));
          this.deleteTarget.set(null);
        },
        error: () => {
          this.errorMessage.set('Could not delete the category. Please try again.');
          this.deleteTarget.set(null);
        },
      });
  }
}
