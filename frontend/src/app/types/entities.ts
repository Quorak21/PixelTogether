// modèles domaine front — alignés sur les payloads socket du back (pas de classes, juste des types)

export type ParticipantRole = 'manager' | 'player';

export type RoomStatus = 'waiting' | 'started'; // started = session canvas en cours

export type WrMode = 'players' | 'voting' | 'voteResult' | 'podium'; // pilote l'UI waiting room (getWrMode côté back)

export interface PodiumPlayer {
  rank: number;
  pseudo: string;
  avatarColor: string;
  voteTotal: number;
}

export interface PodiumGrid {
  rank: number;
  label: string;
  image: string | null;
  voteCount: number;
}

export interface VoteCandidate {
  groupCode: string;
  groupIndex: number;
  label: string;
  image: string | null;
  voteCount: number;
}

// champs vote réutilisés dans waitingRoomState, sessionEnded, voteStateUpdated
export interface VoteStateFields {
  wrMode: WrMode;
  voteCandidates: VoteCandidate[];
  myVote?: string | null;
  winnerGroupCode?: string | null;
  winnerImage?: string | null;
  isLastVote?: boolean;
  topPlayers?: PodiumPlayer[];
  topGrids?: PodiumGrid[];
}

export interface PlayerProfile {
  pseudo: string;
  avatarColor: string;
}

export interface PublicPlayer extends PlayerProfile {
  socketId: string;
}

export interface GroupPlayer extends PublicPlayer {
  colors: string[]; // assignedColors renvoyées par le back (sous-ensemble GAME_PALETTE_16)
}

export interface WaitingRoomPlayer extends PlayerProfile {
  socketId: string;
  role: 'player';
}

// carte lobby manager — preview + joueurs d'un groupe
export interface EventGroupCard {
  eventId: string;
  groupCode: string;
  groupIndex: number;
  label: string;
  players: GroupPlayer[];
  image?: string | null;
}

// réponse getEventLobby — images map en plus des groupes pour accès rapide
export interface EventLobbyState {
  eventId: string;
  partyName: string;
  theme: string;
  name: string;
  sessionCount: number;
  currentSession: number;
  sessionDurationMinutes?: number;
  sessionEndsAt?: number | null;
  status: RoomStatus;
  groups: EventGroupCard[];
  images: Record<string, string>;
}

// réponse joinGroup — état initial du canvas
export interface GridStatePayload {
  eventId: string;
  groupCode: string;
  groupIndex: number;
  groupLabel: string;
  partyName: string;
  theme: string;
  pixels: Record<string, string>; // clés "x,y" comme côté back
  width: number;
  height: number;
  name: string;
  colors: string[];
  role: ParticipantRole;
  teammates: GroupPlayer[];
  sessionEndsAt?: number | null;
}

// push fin de session — renvoie tout le monde en WR avec wrMode voting
export interface SessionEndedPayload extends VoteStateFields {
  eventId: string;
  partyName: string;
  theme: string;
  sessionCount: number;
  currentSession: number;
  partyStarted?: boolean;
  players: PublicPlayer[];
  status: 'waiting';
}

export interface GroupTransitionPlayerPayload {
  eventId: string;
  groupCode: string;
  groupIndex: number;
  groupLabel: string;
  partyName: string;
  theme: string;
  sessionCount: number;
  currentSession: number;
  sessionEndsAt?: number | null;
  role: 'player';
  myColors: string[];
  teammates: GroupPlayer[];
}

export interface GroupTransitionManagerPayload {
  eventId: string;
  partyName: string;
  theme: string;
  sessionCount: number;
  currentSession: number;
  sessionEndsAt?: number | null;
  role: 'manager';
  groups: { groupCode: string; groupIndex: number; groupLabel: string; players: GroupPlayer[] }[];
}

// contenu modale transition 5s — rempli par gameStarted avant navigation
export type GroupTransitionPayload = GroupTransitionPlayerPayload | GroupTransitionManagerPayload;
