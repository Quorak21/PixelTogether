export type ParticipantRole = 'host' | 'player';

export type RoomStatus = 'waiting' | 'started';

export interface PlayerProfile {
  pseudo: string;
  avatarColor: string;
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
}

export interface GridStatePayload {
  pixels: Record<string, string>;
  width: number;
  height: number;
  name: string;
  colors: string[];
  role: ParticipantRole;
}

export interface ActiveGridsPayload {
  activeGrids: Record<string, LobbyRoom>;
  images: Record<string, string>;
}
