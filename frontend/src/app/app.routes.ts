import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting/waiting-room-page/waiting-room-page';
import { LandingPageComponent } from './features/landing/landing-page/landing-page';
import { DocumentationPageComponent } from './features/documentation/documentation-page/documentation-page';
import { LobbyPageComponent } from './features/lobby/lobby-page/lobby-page';
import { roomGuard } from './core/guards/room.guard';
import { sessionGuard } from './core/guards/session.guard';
import { PRIVATE_SEO } from './core/services/seo.service';

// parcours : / → /room → /lobby ou /game → retour /room entre sessions
export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    title: 'PixelTogether — Team building pixel-art',
  },
  {
    path: 'documentation',
    component: DocumentationPageComponent,
    title: 'Documentation | PixelTogether',
    data: {
      description:
        'Documentation de PixelTogether : modes coopératif et compétitif, rôles, chat, votes et conservation des données.',
      canonicalPath: '/documentation',
    },
  },
  {
    path: 'room/:roomId',
    component: WaitingRoomPageComponent,
    canActivate: [roomGuard],
    title: 'PixelTogether',
    data: PRIVATE_SEO,
  },
  {
    path: 'lobby/:eventId',
    component: LobbyPageComponent,
    canActivate: [sessionGuard],
    title: 'PixelTogether',
    data: PRIVATE_SEO,
  },
  {
    path: 'game/:eventId/:groupCode',
    loadChildren: () =>
      import('./features/game/game.routes').then((m) => m.GAME_ROUTES),
    canActivate: [sessionGuard],
    title: 'PixelTogether',
    data: PRIVATE_SEO,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
