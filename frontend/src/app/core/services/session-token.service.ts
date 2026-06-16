import { Injectable } from '@angular/core';
import { ParticipantRole } from '../../types/entities';

const STORAGE_KEY = 'pxl-session';

/** Données de session persistées en localStorage pour la reconnexion. */
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
  save(data: SessionTokenData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  read(): SessionTokenData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SessionTokenData;
    } catch {
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  isExpired(session: SessionTokenData | null = this.read()): boolean {
    if (!session) return true;
    return Date.now() > session.expiresAt;
  }

  hasValidSession(): boolean {
    const session = this.read();
    return Boolean(session && !this.isExpired(session));
  }

  updateGroupCode(groupCode: string): void {
    const session = this.read();
    if (!session) return;
    this.save({ ...session, groupCode });
  }

  /** Met à jour le token depuis une réponse serveur (playerId/token/expiresAt inchangés ou renvoyés). */
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
