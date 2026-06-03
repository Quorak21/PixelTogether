import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../config/runtime-config';
import { SocketService } from './socket.service';
import { UserSession } from '../../types/entities';
import { AuthenticatedPayload } from '../../types/socket-payloads';

interface AuthHttpResponse {
  message: string;
  token: string;
  gridID: string | null;
  gridName?: string | null;
  userImg?: string | null;
  gold?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly apiUrl = getApiUrl();
  private initialized = false;

  readonly currentUser = signal<UserSession | null>(null);
  readonly gold = signal(0);
  readonly isAuthLoading = signal(!!localStorage.getItem('token'));
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  initAuthFromToken(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const token = localStorage.getItem('token');
    if (!token) {
      this.isAuthLoading.set(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      this.isAuthLoading.set(false);
    }, 3000);

    const onAuthenticated = (payload: AuthenticatedPayload) => {
      if (payload?.pseudo) {
        this.currentUser.set({
          pseudo: payload.pseudo,
          gridID: payload.gridID ?? null,
          gridName: payload.gridName ?? payload.gridID ?? null,
          userImg: payload.userImg ?? null
        });
      }

      if (typeof payload.gold === 'number') {
        this.gold.set(payload.gold);
      }
      this.isAuthLoading.set(false);
      window.clearTimeout(timeout);
    };

    this.socket.on<AuthenticatedPayload>('authenticated', onAuthenticated);
    this.socket.setAuthToken(token);
  }

  async register(pseudo: string, password: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<AuthHttpResponse>(`${this.apiUrl}/api/register`, {
        pseudo,
        password
      })
    );

    return response.message;
  }

  async login(pseudo: string, password: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<AuthHttpResponse>(`${this.apiUrl}/api/login`, {
        pseudo,
        password
      })
    );

    localStorage.setItem('token', response.token);
    this.currentUser.set({
      pseudo,
      gridID: response.gridID ?? null,
      gridName: response.gridName ?? response.gridID ?? null,
      userImg: response.userImg ?? null
    });
    this.gold.set(response.gold ?? 0);
    this.socket.setAuthToken(response.token);
    this.isAuthLoading.set(false);

    return response.message;
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.gold.set(0);
    this.isAuthLoading.set(false);
    this.socket.disconnect();
  }

  setGold(value: number): void {
    this.gold.set(value);
  }

  setGridId(gridId: string | null): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    this.currentUser.set({
      ...user,
      gridID: gridId,
      gridName: gridId ?? null
    });
  }
}
