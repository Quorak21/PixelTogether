export const GRID_SIZE = 75;

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const GROUP_CODE_CHARS = '23456789';
export const ROOM_CODE_LENGTH = 6;
export const GROUP_CODE_LENGTH = 4;
export const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;
export const GROUP_CODE_REGEX = /^[2-9]{4}$/;

export const GAME_PALETTE_16 = [
  '#000000',
  '#6b4423',
  '#38b764',
  '#f4b41b',
  '#ffffff',
  '#e53b44',
  '#f18d2d',
  '#a3a7c2',
  '#3e8948',
  '#215d5e',
  '#f7e26b',
  '#b13e53',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#ef7d57',
];

export const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export const LABEL_MIN = 3;
export const LABEL_MAX = 30;
export const LABEL_REGEX = /^.{3,30}$/s;
export const PSEUDO_REGEX = LABEL_REGEX;

export const PIXEL_COLOR_REGEX = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
export const MESSAGE_REGEX = /^.{1,200}$/;
