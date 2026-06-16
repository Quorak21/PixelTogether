import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from './socket.service';
import { SessionTokenService } from './session-token.service';
import { UiStateService } from './ui-state.service';
import {
  ReconnectSessionPayload,
  ReconnectSessionResponse,
  WaitingRoomStatePayload,
} from '../../types/socket-payloads';
import { GridStatePayload } from '../../types/entities';

/** Centralise l'appel reconnectSession et la navigation selon la phase. */
@Injectable({ providedIn: 'root' })
export class ReconnectService {
  private readonly socket = inject(SocketService);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly ui = inject(UiStateService);
  private readonly router = inject(Router);

  async reconnect(): Promise<ReconnectSessionResponse | null> {
    const session = this.sessionToken.read();
    if (!session || this.sessionToken.isExpired(session)) {
      if (session) this.sessionToken.clear();
      return null;
    }

    const response = await this.socket.emitWithAck<ReconnectSessionPayload, ReconnectSessionResponse>(
      'reconnectSession',
      { token: session.token },
    );

    if (response.error === 'PARTY_GONE' || response.error) {
      if (response.error === 'PARTY_GONE') {
        this.sessionToken.clear();
      }
      return null;
    }

    this.sessionToken.patchFromServer({
      playerId: response.playerId,
      token: response.token,
      expiresAt: response.expiresAt,
      role: response.role,
      eventId: response.eventId,
      groupCode: response.groupCode ?? null,
    });

    return response;
  }

  /** Applique l'état UI et navigue vers la route adaptée à la phase. */
  async resumeAndNavigate(response: ReconnectSessionResponse): Promise<boolean> {
    const eventId = response.eventId;
    if (!eventId) return false;

    if (response.phase === 'game' && response.groupCode && response.gridState) {
      this.hydrateGridState(response.gridState);
      this.ui.joinGame(eventId, response.groupCode);
      await this.router.navigateByUrl(`/game/${eventId}/${response.groupCode}`);
      return true;
    }

    if (response.phase === 'lobby' && response.lobbyState) {
      this.hydrateLobbyState(response.lobbyState, eventId);
      await this.router.navigateByUrl(`/lobby/${eventId}`);
      return true;
    }

    if (response.waitingRoomState) {
      this.hydrateWaitingRoom(response.waitingRoomState);
      this.ui.joinWaitingRoom(eventId);
      await this.router.navigateByUrl(`/room/${eventId}`);
      return true;
    }

    return false;
  }

  hydrateWaitingRoom(state: WaitingRoomStatePayload): void {
    this.ui.setRole(state.role);
    this.ui.partyName.set(state.partyName);
    this.ui.gameTheme.set(state.theme ?? state.name);
    this.ui.setSessionMeta(state.sessionCount, state.currentSession, Boolean(state.partyStarted));
    this.ui.setPartyGameMode(state.gameMode);

    if (state.playerId && state.token && state.expiresAt) {
      this.sessionToken.patchFromServer({
        playerId: state.playerId,
        token: state.token,
        expiresAt: state.expiresAt,
        role: state.role,
        eventId: state.eventId ?? state.roomId,
      });
    }

    if (state.isRegistered) {
      if (state.role === 'manager' && state.managerProfile) {
        this.ui.setCurrentProfile(state.managerProfile);
      } else {
        const playerId = state.playerId ?? this.sessionToken.read()?.playerId;
        const me = state.players.find(
          (p) => p.playerId === playerId || p.socketId === this.socket.id(),
        );
        if (me) {
          this.ui.setCurrentProfile({ pseudo: me.pseudo, avatarColor: me.avatarColor });
        }
      }
    }
  }

  hydrateGridState(data: GridStatePayload): void {
    this.ui.setRole(data.role);
    if (data.gameMode) {
      this.ui.setPartyGameMode(data.gameMode);
    }
    this.ui.gameTheme.set(data.theme ?? data.name);
    this.ui.partyName.set(data.partyName);
    this.ui.groupLabel.set(data.groupLabel);
    this.ui.setSessionEndsAt(data.sessionEndsAt);
    this.ui.setGroupTeammates(data.teammates ?? []);
    const managerPlays = data.gameMode === 'coop' && data.role === 'manager';
    if ((data.role === 'player' || managerPlays) && data.colors.length) {
      this.ui.setColorsFromGrid(data.colors);
    }
    this.syncSelfProfileFromTeammates(data.teammates ?? []);
  }

  /** Restaure le pseudo/avatar du joueur courant depuis la liste coéquipiers. */
  syncSelfProfileFromTeammates(teammates: GridStatePayload['teammates']): void {
    const playerId = this.sessionToken.read()?.playerId;
    const me = teammates.find(
      (mate) => mate.playerId === playerId || mate.socketId === this.socket.id(),
    );
    if (me) {
      this.ui.setCurrentProfile({ pseudo: me.pseudo, avatarColor: me.avatarColor });
    }
  }

  hydrateLobbyState(
    response: NonNullable<ReconnectSessionResponse['lobbyState']>,
    eventId: string,
  ): void {
    this.ui.currentEventId.set(eventId);
    this.ui.partyName.set(response.partyName);
    this.ui.gameTheme.set(response.theme ?? response.name);
    this.ui.setSessionMeta(response.sessionCount ?? 1, response.currentSession ?? 1, true);
    this.ui.setRole('manager');
    if (response.sessionEndsAt) {
      this.ui.setSessionEndsAt(response.sessionEndsAt);
    }
  }

  saveFromWaitingRoom(state: WaitingRoomStatePayload): void {
    if (!state.token || !state.playerId || !state.expiresAt) return;
    this.sessionToken.save({
      token: state.token,
      playerId: state.playerId,
      role: state.role,
      eventId: state.eventId ?? state.roomId,
      groupCode: this.sessionToken.read()?.groupCode ?? null,
      expiresAt: state.expiresAt,
    });
  }

  saveFromNewGrid(response: {
    id?: string;
    role?: string;
    playerId?: string;
    token?: string;
    expiresAt?: number;
  }): void {
    if (!response.id || !response.playerId || !response.token || !response.expiresAt) return;
    this.sessionToken.save({
      token: response.token,
      playerId: response.playerId,
      role: 'manager',
      eventId: response.id,
      groupCode: null,
      expiresAt: response.expiresAt,
    });
  }
}
