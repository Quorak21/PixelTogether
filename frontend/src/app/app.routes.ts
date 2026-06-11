import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting/waiting-room-page/waiting-room-page';

// parcours : / → /room → /lobby ou /game → retour /room entre sessions
export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then((m) => m.LANDING_ROUTES),
  },
  {
    path: 'room/:roomId',
    component: WaitingRoomPageComponent,
  },
  {
    path: 'lobby',
    loadChildren: () =>
      import('./features/lobby/lobby.routes').then((m) => m.LOBBY_ROUTES),
  },
  {
    path: 'game/:eventId/:groupCode',
    loadChildren: () =>
      import('./features/game/game.routes').then((m) => m.GAME_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
