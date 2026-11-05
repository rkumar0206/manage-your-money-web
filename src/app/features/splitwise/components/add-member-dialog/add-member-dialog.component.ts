import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplitwiseService } from '../../services/splitwise.service';
import { GroupMemberInput, UserSearchResponse } from '../../models/splitwise.model';
import { debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-dialog-backdrop sm:items-center sm:p-4"
      (click)="cancelled.emit()"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
        (click)="$event.stopPropagation()"
      >
        <h2 class="text-lg font-bold text-slate-900 mb-4">Add Members to Group</h2>

        <!-- Selected Members to Add -->
        @if (membersToAdd().length > 0) {
          <div class="mb-4 flex flex-wrap gap-2">
            @for (m of membersToAdd(); track $index) {
              <div
                class="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 py-1 pl-3 pr-1.5 text-sm font-medium text-indigo-700"
              >
                {{ m.name }}
                <button
                  (click)="removeMember($index)"
                  class="flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3 w-3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Search Input -->
        <div class="relative mb-4">
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search or type a guest name..."
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <!-- Dropdown -->
        @if (dropdownOpen() && searchQuery().trim().length > 0) {
          <div
            class="absolute left-5 right-5 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1.5"
          >
            @if (searchResults().length > 0) {
              @for (user of searchResults(); track user.id) {
                <button
                  (click)="addRegisteredUser(user)"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-100"
                >
                  <span class="text-sm font-medium text-slate-900">{{ user.username }}</span>
                  <span class="text-xs text-slate-500">{{ user.email }}</span>
                </button>
              }
            } @else if (!isSearching()) {
              <button
                (click)="addDummyUser()"
                class="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Add "{{ searchQuery().trim() }}" as a guest
              </button>
            }
          </div>
        }

        <!-- Actions -->
        <div class="mt-6 flex justify-end gap-2">
          <button
            (click)="cancelled.emit()"
            class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            (click)="onSave()"
            [disabled]="membersToAdd().length === 0 || isLoading()"
            class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ isLoading() ? 'Adding...' : 'Add Members' }}
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMemberDialogComponent {
  private readonly splitwiseService = inject(SplitwiseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eRef = inject(ElementRef);

  readonly groupId = input.required<number>();
  readonly existingUserIds = input.required<Set<number>>();

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly membersToAdd = signal<GroupMemberInput[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<UserSearchResponse[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly dropdownOpen = signal(false);
  protected readonly isLoading = signal(false);

  constructor() {
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const term = q.trim();
          if (term.length < 2) {
            this.searchResults.set([]);
            return of([]);
          }
          this.isSearching.set(true);
          return this.splitwiseService
            .searchUsers(term)
            .pipe(finalize(() => this.isSearching.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        // Filter out users already in the group
        const existing = this.existingUserIds();
        this.searchResults.set(res.filter((u) => !existing.has(u.id)));
      });
  }

  protected onSearchInput(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
  }

  protected addRegisteredUser(user: UserSearchResponse) {
    this.membersToAdd.update((m) => [...m, { userId: user.id, name: user.fullName }]);
    this.searchQuery.set('');
    this.dropdownOpen.set(false);
  }

  protected addDummyUser() {
    const name = this.searchQuery().trim();
    if (!name) return;
    this.membersToAdd.update((m) => [...m, { userId: null, name }]);
    this.searchQuery.set('');
    this.dropdownOpen.set(false);
  }

  protected removeMember(index: number) {
    this.membersToAdd.update((m) => m.filter((_, i) => i !== index));
  }

  protected onSave() {
    if (this.membersToAdd().length === 0) return;
    this.isLoading.set(true);
    this.splitwiseService
      .addMembers(this.groupId(), this.membersToAdd())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(() => this.saved.emit());
  }

  @HostListener('document:click', ['$event'])
  protected onClickOutside(e: MouseEvent) {
    if (!this.eRef.nativeElement.contains(e.target)) this.dropdownOpen.set(false);
  }
}
