import { Routes } from '@angular/router';
import { WaitingRoomPageComponent } from './features/waiting/waiting-room-page/waiting-room-page';
import { LandingPageComponent } from './features/landing/landing-page/landing-page';
import { DocumentationPageComponent } from './features/documentation/documentation-page/documentation-page';
import { MentionsPageComponent } from './features/mentions/mentions-page/mentions-page';
import { EntreprisesPageComponent } from './features/entreprises/entreprises-page/entreprises-page';
import { AboutPageComponent } from './features/about/about-page/about-page';
import { LobbyPageComponent } from './features/lobby/lobby-page/lobby-page';
import { roomGuard } from './core/guards/room.guard';
import { sessionGuard } from './core/guards/session.guard';
import { PRIVATE_SEO } from './core/services/seo.service';

const PAGE_TITLE = 'PixelTogether — Atelier collaboratif de team building pour équipes';

// parcours : / → /room → /lobby ou /session → retour /room entre sessions
export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    title: PAGE_TITLE,
  },
  {
    path: 'entreprises',
    component: EntreprisesPageComponent,
    title: 'Pour les équipes et les organisations | PixelTogether',
    data: {
      description:
        'Atelier de team building pour les organisations : publics, objectifs, déroulé de 30 à 60 minutes et formats.',
      canonicalPath: '/entreprises',
    },
  },
  {
    path: 'a-propos',
    component: AboutPageComponent,
    title: 'À propos | PixelTogether',
    data: {
      description:
        'PixelTogether est un atelier de team building en ligne pour les écoles et les entreprises. Projet personnel de Dokk, en version bêta.',
      canonicalPath: '/a-propos',
    },
  },
  {
    path: 'documentation',
    component: DocumentationPageComponent,
    title: 'Documentation | PixelTogether',
    data: {
      description:
        'Documentation de PixelTogether : formats d’atelier, rôles, chat et conservation des données.',
      canonicalPath: '/documentation',
    },
  },
  {
    path: 'mentions',
    component: MentionsPageComponent,
    title: 'Mentions | PixelTogether',
    data: {
      description:
        'Mentions de PixelTogether : éditeur, contact et données. Projet personnel en bêta, sans compte.',
      canonicalPath: '/mentions',
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
    path: 'session/:eventId/:groupCode',
    loadChildren: () =>
      import('./features/game/session.routes').then((m) => m.GAME_ROUTES),
    canActivate: [sessionGuard],
    title: 'PixelTogether',
    data: PRIVATE_SEO,
  },
  {
    path: 'game/:eventId/:groupCode',
    redirectTo: 'session/:eventId/:groupCode',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
