import { Routes } from '@angular/router';
import { GamePageComponent } from './game-page/game-page';

// lazy depuis app.routes — gros chunk canvas, preload via preload-game
export const GAME_ROUTES: Routes = [
  { path: '', component: GamePageComponent },
];
