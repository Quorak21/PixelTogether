import {
  EventLobbyState,
  GroupTransitionHostPayload,
  GroupTransitionPlayerPayload,
  ParticipantRole,
  PlayerProfile,
  RoomStatus,
  SessionEndedPayload,
  WaitingRoomPlayer,
} from './entities';

export type { SessionEndedPayload };

export interface NewGridPayload {
  partyName: string;
  theme: string;
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
  eventId?: string;
  partyName: string;
  theme: string;
  name: string;
  sessionCount: number;
  currentSession: number;
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
  eventId?: string;
  roomId?: string;
  status?: RoomStatus;
  error?: string;
}

export type GameStartedPayload = GroupTransitionPlayerPayload | GroupTransitionHostPayload;

export interface WaitingRoomErrorPayload {
  error: string;
}

export interface GetEventLobbyPayload {
  eventId: string;
}

export interface EventLobbyStatePayload extends EventLobbyState {
  error?: string;
}

export interface GroupPreviewUpdatedPayload {
  eventId: string;
  groupCode: string;
  image: string;
}

export interface JoinGroupPayload {
  eventId: string;
  groupCode: string;
}

export interface EndSessionPayload {
  eventId: string;
}

export interface EndSessionResponse {
  ok?: boolean;
  eventId?: string;
  error?: string;
}
