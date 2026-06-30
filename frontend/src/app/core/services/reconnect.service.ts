import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from './socket.service';
import { SessionTokenService } from './session-token.service';
import { UiStateService } from './ui-state.service';
import {
  ReconnectSessionPayload,
  ReconnectSessionResponse,
  WaitingRoomStatePayload,
  EventLobbyStatePayload,
} from '../../types/socket-payloads';
import { GridStatePayload } from '../../types/entities';

/** 
 * Service centralisant les demandes de reconnexion de session et l'orientation
 * de la navigation en fonction de la phase de jeu courante.
 */
@Injectable({ providedIn: 'root' })
export class ReconnectService {
  private readonly socket = inject(SocketService);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly ui = inject(UiStateService);
  private readonly router = inject(Router);

  private hadTransportDisconnect = false;
  private resyncInFlight = false;
  private gridResyncHandler: ((data: GridStatePayload) => void) | null = null;
  private waitingRoomResyncHandler: ((state: WaitingRoomStatePayload) => void) | null = null;
  private lobbyResyncHandler: ((state: EventLobbyStatePayload) => void) | null = null;

  constructor() {
    this.socket.on('disconnect', () => {
      this.hadTransportDisconnect = true;
    });
    this.socket.on('connect', () => {
      void this.handleTransportReconnect();
    });
  }

  setGridResyncHandler(handler: ((data: GridStatePayload) => void) | null): void {
    this.gridResyncHandler = handler;
  }

  setWaitingRoomResyncHandler(handler: ((state: WaitingRoomStatePayload) => void) | null): void {
    this.waitingRoomResyncHandler = handler;
  }

  setLobbyResyncHandler(handler: ((state: EventLobbyStatePayload) => void) | null): void {
    this.lobbyResyncHandler = handler;
  }

  /**
   * Tente de rétablir la session de jeu active auprès du backend.
   * Lit le jeton local, valide s'il n'est pas expiré et interroge le serveur via 'reconnectSession'.
   * En cas de réussite, met à jour les informations locales de session.
   * 
   * @param options.keepSessionOnNetworkError - Conserve le token si l'ack échoue (resync transport).
   * @returns La réponse du serveur en cas de succès, ou null si la session n'est plus valable.
   */
  async reconnect(options?: { keepSessionOnNetworkError?: boolean }): Promise<ReconnectSessionResponse | null> {
    const session = this.sessionToken.read();
    if (!session || this.sessionToken.isExpired(session)) {
      if (session) this.sessionToken.clear();
      return null;
    }

    let response: ReconnectSessionResponse;
    try {
      response = await this.socket.emitWithAck<ReconnectSessionPayload, ReconnectSessionResponse>(
        'reconnectSession',
        { token: session.token },
      );
    } catch {
      if (!options?.keepSessionOnNetworkError) {
        this.sessionToken.clear();
      }
      return null;
    }

    if (response.error === 'PARTY_GONE' || response.error) {
      if (response.error === 'PARTY_GONE') {
        this.sessionToken.clear();
      }
      return null;
    }

    const groupCode =
      response.phase === 'lobby' ? null : (response.groupCode ?? null);

    this.sessionToken.patchFromServer({
      playerId: response.playerId,
      token: response.token,
      expiresAt: response.expiresAt,
      role: response.role,
      eventId: response.eventId,
      groupCode,
    });

    return response;
  }

  private async handleTransportReconnect(): Promise<void> {
    if (!this.hadTransportDisconnect) {
      return;
    }
    this.hadTransportDisconnect = false;

    if (!this.sessionToken.hasValidSession() || this.resyncInFlight) {
      return;
    }

    this.resyncInFlight = true;
    try {
      await this.applyTransportResync();
    } finally {
      this.resyncInFlight = false;
    }
  }

  private async applyTransportResync(): Promise<void> {
    const response = await this.reconnect({ keepSessionOnNetworkError: true });
    if (!response) {
      if (!this.sessionToken.hasValidSession() && this.isPartyRoute()) {
        await this.navigateToLandingAfterPartyGone();
      }
      return;
    }

    const url = this.router.url.split('?')[0];
    const session = this.sessionToken.read();

    if (response.phase === 'game' && response.gridState && response.groupCode) {
      const gameRoute = this.parseGameRoute(url);
      if (
        gameRoute &&
        this.idsMatch(gameRoute.eventId, response.eventId) &&
        this.idsMatch(gameRoute.groupCode, response.groupCode)
      ) {
        this.hydrateGridState(response.gridState);
        this.gridResyncHandler?.(response.gridState);
        return;
      }
    }

    if (response.phase === 'lobby' && response.lobbyState && response.eventId) {
      const gameRoute = this.parseGameRoute(url);
      if (
        gameRoute &&
        (session?.role === 'manager' || session?.role === 'player') &&
        this.idsMatch(gameRoute.eventId, response.eventId)
      ) {
        this.hydrateLobbyState(response.lobbyState, response.eventId, session?.role);
        this.socket.emit('joinGroup', {
          eventId: gameRoute.eventId,
          groupCode: gameRoute.groupCode,
        });
        if (session?.role === 'player') {
          this.ui.setSpectatorMode(true);
        }
        return;
      }

      const lobbyEventId = this.parseLobbyRoute(url);
      if (lobbyEventId && this.idsMatch(lobbyEventId, response.eventId)) {
        this.hydrateLobbyState(response.lobbyState, response.eventId, session?.role);
        this.lobbyResyncHandler?.(response.lobbyState as EventLobbyStatePayload);
        return;
      }
    }

    if (response.waitingRoomState && response.eventId) {
      const roomId = this.parseWaitingRoomRoute(url);
      if (roomId && this.idsMatch(roomId, response.eventId)) {
        this.hydrateWaitingRoom(response.waitingRoomState);
        this.waitingRoomResyncHandler?.(response.waitingRoomState);
        return;
      }
    }

    await this.resumeAndNavigate(response);
  }

  private isPartyRoute(): boolean {
    return /^\/(room|lobby|game)\//i.test(this.router.url.split('?')[0]);
  }

  private async navigateToLandingAfterPartyGone(): Promise<void> {
    this.ui.exitWaitingRoom();
    this.ui.exitGame();
    await this.router.navigateByUrl('/');
  }

  private parseGameRoute(url: string): { eventId: string; groupCode: string } | null {
    const match = url.match(/^\/game\/([^/]+)\/([^/]+)/i);
    if (!match) return null;
    return { eventId: match[1], groupCode: match[2] };
  }

  private parseLobbyRoute(url: string): string | null {
    return url.match(/^\/lobby\/([^/]+)/i)?.[1] ?? null;
  }

  private parseWaitingRoomRoute(url: string): string | null {
    return url.match(/^\/room\/([^/]+)/i)?.[1] ?? null;
  }

  private idsMatch(a: string | undefined, b: string | undefined): boolean {
    return Boolean(a && b && a.toUpperCase() === b.toUpperCase());
  }

  /**
   * Applique l'état de l'interface utilisateur reçu du serveur
   * et redirige l'utilisateur vers la route adaptée à la phase de jeu actuelle.
   * 
   * @param response - La réponse de reconnexion renvoyée par le serveur.
   * @returns true si la navigation a pu être déterminée et effectuée, sinon false.
   */
  async resumeAndNavigate(response: ReconnectSessionResponse): Promise<boolean> {
    const eventId = response.eventId;
    if (!eventId) return false;

    if (response.phase === 'game' && response.groupCode && response.gridState) {
      this.ui.beginGameCanvasLoading();
      this.hydrateGridState(response.gridState);
      this.ui.joinGame(eventId, response.groupCode);
      await this.router.navigateByUrl(`/game/${eventId}/${response.groupCode}`);
      return true;
    }

    if (response.phase === 'lobby' && response.lobbyState) {
      this.hydrateLobbyState(response.lobbyState, eventId, response.role);
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

  /**
   * Hydrate l'état de la salle d'attente (Waiting Room) dans l'UI.
   * 
   * @param state - L'état de la salle d'attente renvoyé par le backend.
   */
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

  /**
   * Hydrate l'état du dessin et de la grille dans l'UI pour la manche en cours.
   * 
   * @param data - L'état de la grille renvoyé par le backend.
   */
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
    if (data.sessionCount !== undefined && data.currentSession !== undefined) {
      this.ui.setSessionMeta(data.sessionCount, data.currentSession, true);
    }
    const managerPlays = data.gameMode === 'coop' && data.role === 'manager';
    if ((data.role === 'player' || managerPlays) && data.colors.length) {
      this.ui.setColorsFromGrid(data.colors);
    }
    this.ui.setCanDrawOnCanvas(data.canDraw !== false);
    if (data.finishedCount !== undefined && data.totalCount !== undefined) {
      this.ui.setGroupFinishProgress(data.finishedCount, data.totalCount);
    }
    if (data.hasMarkedFinished) {
      this.ui.setHasMarkedFinished(true);
    }
    this.syncSelfProfileFromTeammates(data.teammates ?? []);
  }

  /**
   * Restaure le pseudo et l'avatar du joueur courant à partir de la liste des coéquipiers du groupe.
   * 
   * @param teammates - La liste des coéquipiers du groupe.
   */
  syncSelfProfileFromTeammates(teammates: GridStatePayload['teammates']): void {
    const playerId = this.sessionToken.read()?.playerId;
    const me = teammates.find(
      (mate) => mate.playerId === playerId || mate.socketId === this.socket.id(),
    );
    if (me) {
      this.ui.setCurrentProfile({ pseudo: me.pseudo, avatarColor: me.avatarColor });
    }
  }

  /**
   * Hydrate l'état de l'écran d'accueil du manager (Lobby) dans l'UI.
   * 
   * @param response - L'état de lobby renvoyé par le backend.
   * @param eventId - L'identifiant unique de l'événement.
   */
  hydrateLobbyState(
    response: NonNullable<ReconnectSessionResponse['lobbyState']>,
    eventId: string,
    role?: 'manager' | 'player',
  ): void {
    this.ui.currentEventId.set(eventId);
    this.ui.partyName.set(response.partyName);
    this.ui.gameTheme.set(response.theme ?? response.name);
    this.ui.setSessionMeta(response.sessionCount ?? 1, response.currentSession ?? 1, true);
    const sessionRole = role ?? this.sessionToken.read()?.role ?? 'manager';
    this.ui.setRole(sessionRole);
    if (response.sessionEndsAt) {
      this.ui.setSessionEndsAt(response.sessionEndsAt);
    }
    this.ui.clearGroupFinishState();
  }

  /**
   * Sauvegarde le jeton de session depuis les données de la salle d'attente.
   * 
   * @param state - L'état actuel de la salle d'attente.
   */
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

  /**
   * Sauvegarde le jeton de session lors de la création d'un nouveau salon par le manager.
   * 
   * @param response - La réponse de création de grille renvoyée par le backend.
   */
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
