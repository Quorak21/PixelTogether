/** Précharge le chunk de la zone de dessin (PERF-04). */
export function preloadGameRoutes(): void {
  void import('../../features/game/session.routes');
}
