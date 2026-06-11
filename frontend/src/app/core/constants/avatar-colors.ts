// liste fermée côté front — le back valide via AVATAR_COLOR_REGEX (#rrggbb)
export const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];
