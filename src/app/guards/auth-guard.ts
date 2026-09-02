import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthManager } from '../services/auth-manager';

export const authGuard: CanActivateFn = () => {
  const authManager = inject(AuthManager);
  const router = inject(Router);

  if (authManager.isAuthenticated()) {
    return true;
  }

  const urlTree = router.createUrlTree(['/login']);
  return new RedirectCommand(urlTree, { replaceUrl: true });
};
