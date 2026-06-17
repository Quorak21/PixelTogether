import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting/waiting-room-page/waiting-room-page';
import { LandingPageComponent } from './features/landing/landing-page/landing-page';
import { LobbyPageComponent } from './features/lobby/lobby-page/lobby-page';

// parcours : / → /room → /lobby ou /game → retour /room entre sessions
export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
  },
  {
    path: 'room/:roomId',
    component: WaitingRoomPageComponent,
  },
  {
    path: 'lobby/:eventId',
    component: LobbyPageComponent,
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

