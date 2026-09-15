import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const contributorGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isContributor()) return true;

  if (!auth.isAuthenticated()) {
    const refreshed = await auth.tryRefresh();
    if (refreshed && auth.isContributor()) return true;
  }

  return router.createUrlTree(['/']);
};
