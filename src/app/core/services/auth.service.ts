import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly SESSION_KEY = 'user_session_active';

  // Private writeable signal to track state
  #isAuthenticated = signal<boolean>(localStorage.getItem(this.SESSION_KEY) === 'true');

  // Public read-only signal exposed to guards and components
  isAuthenticated = this.#isAuthenticated.asReadonly();

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post<any>('/api/v1/auth/login', credentials).pipe(
      tap(() => {
        // Backend successfully dropped the HttpOnly cookies, update local UI state
        this.#isAuthenticated.set(true);
        localStorage.setItem(this.SESSION_KEY, 'true');
      }),
    );
  }

  refreshSession(): Observable<any> {
    return this.http.post<any>('/api/v1/auth/refresh', null, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post<any>('/api/v1/auth/logout', {}).pipe(
      tap(() => {
        this.clearSessionLocally();
      }),
      catchError((error) => {
        // Fallback: Clear UI state locally even if the network request fails
        this.clearSessionLocally();
        return of(error);
      }),
    );
  }

  register(payload: any): Observable<any> {
    return this.http.post<any>('/api/v1/auth/signup', payload);
  }

  resendVerification(email: string): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(
      '/api/v1/auth/resend-verification',
      null,
      { params: { email } },
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/forgot-password', { email });
  }

  clearSessionLocally(): void {
    this.#isAuthenticated.set(false);
    localStorage.removeItem(this.SESSION_KEY);
    this.router.navigate(['/auth/login']);
  }
}
