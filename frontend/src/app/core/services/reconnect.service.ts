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

  /**
   * Tente de rétablir la session de jeu active auprès du backend.
   * Lit le jeton local, valide s'il n'est pas expiré et interroge le serveur via 'reconnectSession'.
   * En cas de réussite, met à jour les informations locales de session.
   * 
   * @returns La réponse du serveur en cas de succès, ou null si la session n'est plus valable.
   */
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
