import { Routes } from '@angular/router';
import { LobbyPageComponent } from './lobby-page/lobby-page';

// lazy depuis app.routes path 'lobby' — manager only en pratique
export const LOBBY_ROUTES: Routes = [
  {
    path: ':eventId',
    component: LobbyPageComponent,
  },
];
