import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile, UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly sidebarCollapsed = input<boolean>(false);
  readonly toggleSidebar = output<void>();

  protected readonly menuOpen = signal(false);
  protected readonly user = signal<UserProfile | null>(null);

  /** Two-letter initials for the avatar bubble; falls back to "MY". */
  protected readonly initials = computed(() => {
    const name = this.user()?.username?.trim();
    if (!name) return 'MY';

    // Split on common separators and take the first letter of up to two parts.
    const parts = name.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  /** Display name: prefer username, otherwise a neutral fallback. */
  protected readonly displayName = computed(() => this.user()?.username ?? 'Signed in');

  constructor() {
    this.loadUser();
  }

  private loadUser(): void {
    this.userService.loadCurrentUser().subscribe({
      next: (u) => this.user.set(u),
      error: () => {
        // Non-critical: menu still works, avatar falls back to "MY".
      },
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-user-menu]')) {
      this.menuOpen.set(false);
    }
  }
}
