// contrats socket req/réponse — un interface par event émis ou acké

import {
  EventLobbyState,
  GroupTransitionManagerPayload,
  GroupTransitionPlayerPayload,
  ParticipantRole,
  PlayerProfile,
  RoomStatus,
  SessionEndedPayload,
  VoteStateFields,
  WaitingRoomPlayer,
} from './entities';

export type { SessionEndedPayload };

// → lobby.handlers newGrid
export interface NewGridPayload {
  partyName: string;
  sessionCount: number;
  themes: string[];
  sessionDurationMinutes: number;
}

export interface NewGridResponse {
  id?: string;
  manager?: string;
  name?: string;
  role?: ParticipantRole;
  error?: string;
}

export interface EnterWaitingRoomPayload {
  roomId: string;
}

// ack enterWaitingRoom + registerPlayer — inclut vote fields
export interface WaitingRoomStatePayload extends VoteStateFields {
  roomId: string;
  eventId?: string;
  partyName: string;
  theme: string;
  name: string;
  sessionCount: number;
  currentSession: number;
  sessionDurationMinutes?: number;
  partyStarted?: boolean;
  status: RoomStatus;
  role: ParticipantRole;
  managerProfile: PlayerProfile | null;
  players: WaitingRoomPlayer[];
  isRegistered: boolean;
  error?: string;
}

// manager et joueurs passent par le même event — le back détecte le rôle
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

// push post-startGame (distinct de StartGameResponse qui est juste l'ack)
export type GameStartedPayload = GroupTransitionPlayerPayload | GroupTransitionManagerPayload;

export interface WaitingRoomErrorPayload {
  error: string;
}

export interface GetEventLobbyPayload {
  eventId: string;
}

// ack getEventLobby — manager only
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

// roomId = eventId (6 chars) — groupCode = 4 digits de l'archive session
export interface CastVotePayload {
  roomId: string;
  groupCode: string;
}

export interface CloseVotePayload {
  roomId: string;
}

export interface ShowResultsPayload {
  roomId: string;
}

export interface EndPartyPayload {
  roomId: string;
}

export interface EndPartyResponse {
  ok?: boolean;
  eventId?: string;
  error?: string;
}

// broadcast après castVote / closeVote / showResults — myVote varie par socket
export interface VoteStateUpdatedPayload extends VoteStateFields {
  eventId: string;
  error?: string;
}
