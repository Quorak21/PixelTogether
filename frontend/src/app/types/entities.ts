export type ParticipantRole = 'host' | 'player';

export type RoomStatus = 'waiting' | 'started';

export interface PlayerProfile {
  pseudo: string;
  avatarColor: string;
}

export interface PublicPlayer extends PlayerProfile {
  socketId: string;
}

export interface GroupPlayer extends PublicPlayer {
  colors: string[];
}

export interface WaitingRoomPlayer extends PlayerProfile {
  socketId: string;
  role: 'player';
}

export interface LobbyRoom {
  id: string;
  host: string;
  name: string;
  width: number;
  height: number;
  playersList: string[];
  status?: RoomStatus;
  groupCount?: number;
}

export interface EventGroupCard {
  eventId: string;
  groupCode: string;
  groupIndex: number;
  label: string;
  players: GroupPlayer[];
  image?: string | null;
}

export interface EventLobbyState {
  eventId: string;
  partyName: string;
  theme: string;
  name: string;
  sessionCount: number;
  currentSession: number;
  status: RoomStatus;
  groups: EventGroupCard[];
  images: Record<string, string>;
}

export interface GridStatePayload {
  eventId: string;
  groupCode: string;
  groupIndex: number;
  groupLabel: string;
  partyName: string;
  theme: string;
  pixels: Record<string, string>;
  width: number;
  height: number;
  name: string;
  colors: string[];
  role: ParticipantRole;
  teammates: GroupPlayer[];
}

export interface SessionEndedPayload {
  eventId: string;
  partyName: string;
  theme: string;
  players: PublicPlayer[];
  status: 'waiting';
}

export interface ActiveGridsPayload {
  activeGrids: Record<string, LobbyRoom>;
  images: Record<string, string>;
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
  role: 'player';
  myColors: string[];
  teammates: GroupPlayer[];
}

export interface GroupTransitionHostPayload {
  eventId: string;
  partyName: string;
  theme: string;
  sessionCount: number;
  currentSession: number;
  role: 'host';
  groups: { groupCode: string; groupIndex: number; groupLabel: string; players: GroupPlayer[] }[];
}

export type GroupTransitionPayload = GroupTransitionPlayerPayload | GroupTransitionHostPayload;
