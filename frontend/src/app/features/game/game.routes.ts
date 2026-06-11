import { Routes } from '@angular/router';
import { GamePageComponent } from './game-page/game-page';

// lazy depuis app.routes — gros chunk (canvas 75×75), preload possible cf backlog PERF-04
export const GAME_ROUTES: Routes = [
  {
    path: '',
    component: GamePageComponent
  }
];
