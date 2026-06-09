import { ParticipantRole, PlayerProfile, RoomStatus, WaitingRoomPlayer } from './entities';

export interface NewGridPayload {
  name: string;
}

export interface NewGridResponse {
  id?: string;
  host?: string;
  name?: string;
  role?: ParticipantRole;
  error?: string;
}

export interface EnterWaitingRoomPayload {
  roomId: string;
}

export interface WaitingRoomStatePayload {
  roomId: string;
  name: string;
  status: RoomStatus;
  role: ParticipantRole;
  hostProfile: PlayerProfile | null;
  players: WaitingRoomPlayer[];
  isRegistered: boolean;
  error?: string;
}

export interface RegisterPlayerPayload {
  roomId: string;
  pseudo: string;
  avatarColor: string;
}

export interface RegisterPlayerResponse extends WaitingRoomStatePayload {
  error?: string;
}

export interface WaitingRoomUpdatedPayload {
  players: WaitingRoomPlayer[];
}

export interface StartGamePayload {
  roomId: string;
}

export interface StartGameResponse {
  roomId?: string;
  status?: RoomStatus;
  error?: string;
}

export interface GameStartedPayload {
  roomId: string;
}

export interface WaitingRoomErrorPayload {
  error: string;
}
