import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for initial auth restoration on page reload before redirecting.
  if (authService.isLoading()) {
    return toObservable(authService.isLoading).pipe(
      filter((loading) => !loading),
      take(1),
      map(() => (authService.isAuthenticated() ? true : router.createUrlTree(['/login'])))
    );
  }

  return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
