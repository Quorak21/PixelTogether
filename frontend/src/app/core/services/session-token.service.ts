import { Injectable } from '@angular/core';
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
  
  /**
   * Sauvegarde les données de session du joueur dans le localStorage.
   * 
   * @param data - L'objet contenant les informations de session à enregistrer.
   */
  save(data: SessionTokenData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  /**
   * Met à jour uniquement le code de groupe dans la session sauvegardée.
   * Très pratique lors d'un reshuffle en fin de manche !
   * 
   * @param groupCode - Le nouveau code de groupe attribué.
   */
  updateGroupCode(groupCode: string): void {
    const session = this.read();
    if (!session) return;
    this.save({ ...session, groupCode });
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
