// contrats socket req/réponse — un interface par event émis ou acké

import {
  EventLobbyState,
  GameMode,
  GridStatePayload,
  GroupTransitionManagerPayload,
  GroupTransitionPlayerPayload,
  ParticipantRole,
  PlayerProfile,
  ReconnectPhase,
  RoomStatus,
  SessionEndedPayload,
  VoteStateFields,
  WaitingRoomPlayer,
} from './entities';

export type { SessionEndedPayload };

export interface ReconnectSessionPayload {
  token: string;
}

export interface ReconnectSessionResponse extends SessionFields {
  phase?: ReconnectPhase;
  eventId?: string;
  role?: ParticipantRole;
  groupCode?: string;
  waitingRoomState?: WaitingRoomStatePayload;
  lobbyState?: EventLobbyState;
  gridState?: GridStatePayload;
  error?: string;
}

export interface SessionFields {
  playerId?: string;
  token?: string;
  expiresAt?: number;
}

// → lobby.handlers newGrid
export interface NewGridPayload {
  partyName: string;
  sessionCount: number;
  themes: string[];
  gameMode: GameMode;
  sessionDurationMinutes?: number;
  token?: string;
}

export interface NewGridResponse extends SessionFields {
  id?: string;
  manager?: string;
  name?: string;
  role?: ParticipantRole;
  error?: string;
}

export interface EnterWaitingRoomPayload {
  roomId: string;
  token?: string;
}

// ack enterWaitingRoom + registerPlayer — inclut vote fields
export interface WaitingRoomStatePayload extends VoteStateFields, SessionFields {
  roomId: string;
  eventId?: string;
  partyName: string;
  theme: string;
  name: string;
  themes: string[];
  gameMode: GameMode;
  sessionCount: number;
  currentSession: number;
  sessionDurationMinutes?: number | null;
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

// ack getEventLobby — manager ou joueur au lobby
export interface EventLobbyStatePayload extends EventLobbyState {
  error?: string;
}

export interface MarkFinishedPayload {
  eventId: string;
  groupCode: string;
}

export interface MarkFinishedResponse {
  ok?: boolean;
  finishedCount?: number;
  totalCount?: number;
  error?: string;
}

export interface GroupFinishProgressPayload {
  eventId: string;
  groupCode: string;
  finishedCount: number;
  totalCount: number;
  finishedPlayerIds?: string[];
}

export interface GroupFinishedPayload {
  eventId: string;
  groupCode: string;
}

export interface LobbyGroupsUpdatedPayload {
  eventId: string;
  groups: EventLobbyState['groups'];
  images: EventLobbyState['images'];
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

export interface RequestExportZipPayload {
  roomId: string;
  token: string;
}

export interface RequestExportZipResponse {
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

// broadcast après castVote / closeVote / showResults — myVote varie par socket
export interface VoteStateUpdatedPayload extends VoteStateFields {
  eventId: string;
  error?: string;
}

export interface ChatTypingPayload {
  eventId: string;
  groupCode: string;
  active: boolean;
}

export interface PlayerTypingPayload {
  socketId: string;
  active: boolean;
}

export interface ChatMessagePayload {
  socketId: string;
  pseudo: string;
  message: string;
  senderId?: string;
  role?: 'manager' | 'player' | 'system';
  systemRole?: string;
  avatarColor?: string | null;
}
