import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';

// State flags to manage concurrent duplicate refresh token requests
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure requests pass along browser cookies natively
  const clonedRequest = req.clone({ withCredentials: true });

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // If the backend drops a 401, our access token is likely dead
      if (error.status === 401 && !clonedRequest.url.includes('/auth/refresh')) {
        return handle401Error(clonedRequest, next, authService, router);
      }

      return throwError(() => error);
    }),
  );
};

// Queue helper mechanism to safely intercept, refresh, and execute delayed payloads
function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshSession().pipe(
      // 1. Instantly signal success & release lock when refresh endpoint responds
      tap(() => {
        isRefreshing = false;
        refreshTokenSubject.next(true);
      }),

      // 2. Catch errors ONLY from the refresh endpoint itself
      catchError((refreshErr) => {
        isRefreshing = false;
        refreshTokenSubject.next(false);

        // Session is dead. Clear state and bounce to login.
        authService.clearSessionLocally();
        router.navigate(['/auth/login'], { queryParams: { sessionExpired: 'true' } });
        return throwError(() => refreshErr);
      }),

      // 3. Retry original request AFTER refresh pipeline error handling is bound
      switchMap(() => {
        // NOTE: If you also pass Bearer tokens via headers, re-clone with the new token here:
        // const token = authService.getAccessToken();
        // const updatedReq = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        // return next(updatedReq);

        return next(request);
      }),
    );
  } else {
    // If a refresh loop is already in progress, wait until the subject emits true, then retry
    return refreshTokenSubject.pipe(
      filter((result) => result !== null),
      take(1),
      switchMap((success) => {
        if (success) {
          return next(request);
        }
        return throwError(() => new Error('Session authentication propagation failed.'));
      }),
    );
  }
}
