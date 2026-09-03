import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionTokenService } from '../services/session-token.service';

export const roomGuard: CanActivateFn = (route) => {
  const sessionToken = inject(SessionTokenService);
  const router = inject(Router);

  if (!sessionToken.hasValidSession()) {
    return true;
  }

  const session = sessionToken.read()!;
  const roomId = (
    route.paramMap.get('roomId') ?? (route.params['roomId'] as string | undefined)
  )?.toUpperCase();

  if (roomId && session.eventId && session.eventId.toUpperCase() !== roomId) {
    return router.parseUrl('/');
  }

  return true;
};
