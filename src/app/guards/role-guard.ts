import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthManager } from '../services/auth-manager';

export const roleGuard = (requiredRole: string): CanActivateFn => {
  return () => {
    const authManager = inject(AuthManager);
    const router = inject(Router);

    const user = authManager.user();

    if (user?.role === requiredRole) {
      return true;
    }

    const urlTree = router.createUrlTree(['/login']);
    return new RedirectCommand(urlTree, { replaceUrl: true });
  };
};
