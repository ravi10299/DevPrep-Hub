import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) return true;

  if (!auth.isAuthenticated()) {
    const refreshed = await auth.tryRefresh();
    if (refreshed && auth.isAdmin()) return true;
  }

  return router.createUrlTree(['/']);
};
