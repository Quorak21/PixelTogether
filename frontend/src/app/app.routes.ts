import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting-room/waiting-room-page/waiting-room-page';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/host/host.routes').then((m) => m.HOST_ROUTES),
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
    path: 'game/:roomId',
    loadChildren: () =>
      import('./features/game/game.routes').then((m) => m.GAME_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
