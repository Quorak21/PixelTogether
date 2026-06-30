import { Injectable, signal } from '@angular/core';
import { ParticipantRole } from '../../types/entities';

const STORAGE_KEY = 'pxl-session';

/** 
 * Données de session persistées en localStorage pour la reconnexion. 
 */
export interface SessionTokenData {
  token: string;
  playerId: string;
  role: ParticipantRole;
  eventId: string;
  groupCode: string | null;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class SessionTokenService {
  private readonly _hasValidSession = signal<boolean>(this.hasValidSession());
  readonly hasSessionSignal = this._hasValidSession.asReadonly();

  private readonly _hasPartyBinding = signal<boolean>(this.isBoundToParty());
  /** Token valide encore rattaché à une room (false après kick — join/création OK). */
  readonly hasPartyBindingSignal = this._hasPartyBinding.asReadonly();

  private refreshSessionSignals(): void {
    this._hasValidSession.set(this.hasValidSession());
    this._hasPartyBinding.set(this.isBoundToParty());
  }

  /**
   * Sauvegarde les données de session du joueur dans le localStorage.
   * 
   * @param data - L'objet contenant les informations de session à enregistrer.
   */
  save(data: SessionTokenData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.refreshSessionSignals();
  }

  /**
   * Récupère les données de session stockées dans le localStorage.
   * Retourne null en cas d'erreur de lecture ou si aucune session n'est enregistrée.
   * 
   * @returns La session lue ou null.
   */
  read(): SessionTokenData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SessionTokenData;
    } catch {
      return null;
    }
  }

  /**
   * Efface les données de session du localStorage (déconnexion complète).
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.refreshSessionSignals();
  }

  /**
   * Vérifie si la session actuelle est expirée par rapport à l'heure du client.
   * 
   * @param session - Optionnel. La session à tester, par défaut celle lue en local.
   * @returns true si la session est expirée ou absente, sinon false.
   */
  isExpired(session: SessionTokenData | null = this.read()): boolean {
    if (!session) return true;
    return Date.now() > session.expiresAt;
  }

  /**
   * Indique si une session valide (existante et non expirée) est présente.
   * 
   * @returns true si la session est valide, sinon false.
   */
  hasValidSession(): boolean {
    const session = this.read();
    return Boolean(session && !this.isExpired(session));
  }

  /** Token valide et encore lié à une room (pas le cas après un kick). */
  isBoundToParty(session: SessionTokenData | null = this.read()): boolean {
    return Boolean(session && !this.isExpired(session) && session.eventId);
  }

  /**
   * Met à jour uniquement le code de groupe dans la session sauvegardée.
   * Très pratique lors d'un reshuffle en fin de manche !
   * 
   * @param groupCode - Le nouveau code de groupe attribué.
   */
  updateGroupCode(groupCode: string | null): void {
    const session = this.read();
    if (!session) return;
    this.save({ ...session, groupCode });
  }

  /** Efface le groupe courant — joueur au lobby après fin de sa grille. */
  clearGroupCode(): void {
    this.updateGroupCode(null);
  }

  /** Efface le lien room/groupe — le token reste valide (ex. après un kick). */
  clearEventBinding(): void {
    const session = this.read();
    if (!session) return;
    this.save({ ...session, eventId: '', groupCode: null });
  }

  /** 
   * Met à jour la session avec de nouvelles informations envoyées par le serveur.
   * Les champs absents conservent leurs valeurs actuelles.
   * 
   * @param fields - Les nouveaux champs à appliquer à la session.
   */
  patchFromServer(fields: {
    playerId?: string;
    token?: string;
    expiresAt?: number;
    role?: ParticipantRole;
    eventId?: string;
    groupCode?: string | null;
  }): void {
    const current = this.read();
    if (!current && !fields.token) return;

    this.save({
      token: fields.token ?? current!.token,
      playerId: fields.playerId ?? current!.playerId,
      role: fields.role ?? current!.role,
      eventId: fields.eventId ?? current!.eventId,
      groupCode: fields.groupCode !== undefined ? fields.groupCode : (current?.groupCode ?? null),
      expiresAt: fields.expiresAt ?? current!.expiresAt,
    });
  }
}
