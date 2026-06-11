// règles métier partagées back/front — modifier ici + session-config.ts côté front
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

export const AVATAR_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

export const SESSION_DURATION_MIN = 1;
export const SESSION_DURATION_MAX = 60;
export const SESSION_DURATION_DEFAULT = 15;
export const MAX_PARTY_DURATION_MINUTES = 60;
export const SESSION_COUNT_MIN = 1;
export const SESSION_COUNT_MAX = 5;
export const SESSION_TRANSITION_SECONDS = 5;

export const LABEL_MIN = 3;
export const LABEL_MAX = 30;
export const LABEL_REGEX = /^.{3,30}$/s;
export const PSEUDO_REGEX = LABEL_REGEX;

export const PIXEL_COLOR_REGEX = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
export const MESSAGE_REGEX = /^.{1,300}$/;
