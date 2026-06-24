import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionTokenService } from '../services/session-token.service';

export const sessionGuard: CanActivateFn = (route) => {
  const sessionToken = inject(SessionTokenService);
  const router = inject(Router);

  if (!sessionToken.hasValidSession()) {
    return router.parseUrl('/');
  }

  const session = sessionToken.read()!;
  const params = route.params;

  const eventId = (params['eventId'] as string | undefined)?.toUpperCase();
  if (eventId && session.eventId.toUpperCase() !== eventId) {
    return router.parseUrl('/');
  }

  const groupCode = params['groupCode'] as string | undefined;
  if (groupCode && session.role !== 'manager' && session.groupCode !== groupCode) {
    return router.parseUrl('/');
  }

  return true;
};
