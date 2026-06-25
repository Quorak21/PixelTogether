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

export const GAME_MODE_COOP = 'coop';
export const GAME_MODE_COMPETITIVE = 'competitive';
export const GAME_MODES = [GAME_MODE_COOP, GAME_MODE_COMPETITIVE];

export const SESSION_DURATION_MIN = 1;
export const SESSION_DURATION_MAX = 20;
export const SESSION_DURATION_DEFAULT = 15;

// coop : pas de timer — sessionDurationMinutes ignoré à la création
export const COOP_GUESTS_MIN = 2;
export const COOP_GUESTS_MAX = 7;
export const COOP_GRID_MAX = 8;
export const COOP_SESSION_COUNT_MIN = 1;
export const COOP_SESSION_COUNT_MAX = 4;

export const COMPETITIVE_PLAYERS_MIN = 6;
export const COMPETITIVE_SESSION_COUNT_MIN = 3;
export const COMPETITIVE_SESSION_COUNT_MAX = 8;

/** Plafond d'invités inscrits par salon (tous modes). */
export const EVENT_PLAYERS_MAX = 40;

// legacy — plus de validation plafond total partie
export const MAX_PARTY_DURATION_MINUTES = 60;
export const SESSION_COUNT_MIN = 1;
export const SESSION_COUNT_MAX = 5;
export const SESSION_TRANSITION_SECONDS = 10;

export const LABEL_MIN = 3;
export const LABEL_MAX = 30;
export const LABEL_REGEX = /^.{3,30}$/s;

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 20;
export const PSEUDO_REGEX = /^.{3,20}$/s;

export const PIXEL_COLOR_REGEX = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
export const MESSAGE_REGEX = /^.{1,300}$/;

// marge token reconnexion après durée estimée de la partie
export const RECONNECT_MARGIN_MINUTES = 15;
// délai avant fermeture auto si le manager est déconnecté
export const MANAGER_DISCONNECT_TIMEOUT_MS = 5 * 60 * 1000;
// popup d'avertissement envoyé ce délai avant la fermeture
export const MANAGER_ABSENT_WARNING_MS = 5 * 1000;

// throttling socket par event
export const PIXEL_COOLDOWN_MS = 50;
export const CHAT_COOLDOWN_MS = 500;
export const VOTE_COOLDOWN_MS = 300;
export const CHAT_MAX_MESSAGES = 750;

// Throttling de la génération des aperçus de groupe
export const PREVIEW_THROTTLE_MS = 1000;

// Limite globale de salons actifs simultanés
export const MAX_ACTIVE_EVENTS = 50;
// Durée maximale d'inactivité avant purge (2 heures)
export const EVENT_INACTIVITY_TTL_MS = 2 * 60 * 60 * 1000;
// Fréquence de nettoyage des salons inactifs (5 minutes)
export const EVENT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

