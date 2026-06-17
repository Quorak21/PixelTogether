/** Précharge le chunk lazy-load game.routes (PERF-04). */
export function preloadGameRoutes(): void {
  void import('../../features/game/game.routes');
}
