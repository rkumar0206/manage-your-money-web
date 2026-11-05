import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { SplitwiseService } from '../../services/splitwise.service';
import { GroupMemberInput, UserSearchResponse } from '../../models/splitwise.model';

@Component({
  selector: 'app-split-group-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './split-group-form.component.html',
  styleUrl: './split-group-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitGroupFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly splitwiseService = inject(SplitwiseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eRef = inject(ElementRef);

  // Form state
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
  });

  protected get name() {
    return this.form.controls.name;
  }
  protected get description() {
    return this.form.controls.description;
  }

  // Members state
  protected readonly members = signal<GroupMemberInput[]>([]);

  // Search state
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<UserSearchResponse[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly dropdownOpen = signal(false);

  // Submit state
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Prevent adding the same user twice
  protected readonly existingUserIds = computed(
    () =>
      new Set(
        this.members()
          .map((m) => m.userId)
          .filter((id) => id != null),
      ),
  );

  constructor() {
    // Debounced search logic
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (q.length < 2) {
            this.searchResults.set([]);
            this.isSearching.set(false);
            return of([]);
          }

          this.isSearching.set(true);
          return this.splitwiseService
            .searchUsers(q)
            .pipe(finalize(() => this.isSearching.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          // Filter out users already added to the group
          const addedIds = this.existingUserIds();
          this.searchResults.set(results.filter((u) => !addedIds.has(u.id)));
        },
        error: () => this.searchResults.set([]),
      });
  }

  // --- Member Management ---

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.dropdownOpen.set(value.trim().length > 0);
  }

  protected addRegisteredUser(user: UserSearchResponse): void {
    this.members.update((curr) => [...curr, { userId: user.id, name: user.fullName }]);
    this.searchQuery.set('');
    this.dropdownOpen.set(false);
  }

  protected addDummyUser(): void {
    const dummyName = this.searchQuery().trim();
    if (!dummyName) return;

    // Optional: Prevent duplicate names for dummies (case-insensitive)
    const isDuplicate = this.members().some(
      (m) => m.name.toLowerCase() === dummyName.toLowerCase(),
    );
    if (isDuplicate) {
      this.errorMessage.set('A member with this name already exists.');
      return;
    }

    this.members.update((curr) => [...curr, { userId: null, name: dummyName }]);
    this.searchQuery.set('');
    this.dropdownOpen.set(false);
    this.errorMessage.set(null);
  }

  protected removeMember(index: number): void {
    this.members.update((curr) => curr.filter((_, i) => i !== index));
  }

  // --- Dropdown behavior ---

  @HostListener('document:click', ['$event'])
  protected onClickOutside(event: MouseEvent): void {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  // --- Submit ---

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.members().length === 0) {
      this.errorMessage.set('Please add at least one other member to split with.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.form.getRawValue().name.trim(),
      description: this.form.getRawValue().description.trim() || undefined,
      members: this.members(),
    };

    this.splitwiseService
      .createGroup(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.router.navigate(['/splits', res.id]),
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ?? 'Could not create the group. Please try again.',
          );
        },
      });
  }

  // --- UI Helpers ---

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  protected getAvatarColor(name: string): string {
    // Generate a deterministic color based on the name string
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-sky-100 text-sky-700',
      'bg-fuchsia-100 text-fuchsia-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
