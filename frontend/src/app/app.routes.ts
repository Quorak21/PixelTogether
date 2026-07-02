import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting/waiting-room-page/waiting-room-page';
import { LandingPageComponent } from './features/landing/landing-page/landing-page';
import { DocumentationPageComponent } from './features/documentation/documentation-page/documentation-page';
import { LobbyPageComponent } from './features/lobby/lobby-page/lobby-page';
import { roomGuard } from './core/guards/room.guard';
import { sessionGuard } from './core/guards/session.guard';

// parcours : / → /room → /lobby ou /game → retour /room entre sessions
export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
  },
  {
    path: 'documentation',
    component: DocumentationPageComponent,
  },
  {
    path: 'room/:roomId',
    component: WaitingRoomPageComponent,
    canActivate: [roomGuard],
  },
  {
    path: 'lobby/:eventId',
    component: LobbyPageComponent,
    canActivate: [sessionGuard],
  },
  {
    path: 'game/:eventId/:groupCode',
    loadChildren: () =>
      import('./features/game/game.routes').then((m) => m.GAME_ROUTES),
    canActivate: [sessionGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

