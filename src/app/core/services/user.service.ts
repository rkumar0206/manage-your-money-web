import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UserProfile {
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/users';

  private currentUserSignal = signal<UserProfile | null>(null);
  readonly currentUserProfile = this.currentUserSignal.asReadonly();

  isAdmin = computed(() => this.currentUserProfile()?.roles.includes('ROLE_ADMIN') ?? false);

  loadCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.apiUrl).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
      }),
    );
  }

  clearCurrentUser(): void {
    this.currentUserSignal.set(null);
  }
}
