import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then((m) => m.LANDING_ROUTES)
  },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/lobby/lobby.routes').then((m) => m.LOBBY_ROUTES)
  },
  {
    path: 'game/:roomId',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/game/game.routes').then((m) => m.GAME_ROUTES)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
