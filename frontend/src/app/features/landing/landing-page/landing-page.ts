import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideCrown, LucideUsers, LucidePalette } from '@lucide/angular';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SessionTokenService } from '../../../core/services/session-token.service';
import { ReconnectService } from '../../../core/services/reconnect.service';
import { SocketService } from '../../../core/services/socket.service';
import { PartyCreationModalComponent } from '../party-creation-modal/party-creation-modal';
import { GridPixelSplashComponent } from '../../../shared/grid-pixel-splash/grid-pixel-splash';
import { GameMode } from '../../../types/entities';
import { preloadGameRoutes } from '../../../core/utils/preload-game';

const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export type InfoModalKind = 'why' | 'docs';

// entrée app : reprise auto si token valide, sinon join / création
@Component({
  selector: 'app-landing-page',
  imports: [
    PartyCreationModalComponent,
    ReactiveFormsModule,
    LucideCrown,
    LucideUsers,
    LucidePalette,
    GridPixelSplashComponent,
  ],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly reconnect = inject(ReconnectService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly error = signal('');
  readonly infoModal = signal<InfoModalKind | null>(null);
  readonly isResuming = signal(false);
  readonly serverMaxCapReached = signal(false);
  readonly hasActiveSession = this.sessionToken.hasSessionSignal;

  readonly form = this.fb.nonNullable.group({
    code: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^[A-Za-z2-9]{6}$/)],
    ],
  });

  constructor() {
    effect(() => {
      const externalError = this.ui.joinRoomError();
      if (externalError) {
        this.error.set(externalError);
        this.ui.joinRoomError.set(null);
      }
    });
  }

  ngOnInit(): void {
    preloadGameRoutes();
    void this.tryResumeSession();
    this.destroyRef.onDestroy(this.socket.on('serverCapacity', this.onServerCapacity));
  }

  private readonly onServerCapacity = (...args: unknown[]) => {
    const payload = args[0] as { maxCapReached: boolean } | undefined;
    this.serverMaxCapReached.set(payload?.maxCapReached ?? false);
  };

  openInfoModal(kind: InfoModalKind): void {
    this.infoModal.set(kind);
  }

  closeInfoModal(): void {
    this.infoModal.set(null);
  }

  openCreateModal(mode: GameMode): void {
    if (this.hasActiveSession()) return;
    this.ui.openPartyCreation(mode);
  }

  joinRoom(): void {
    if (this.hasActiveSession() || this.form.invalid) {
      return;
    }

    this.error.set('');
    const code = this.form.controls.code.value.trim().toUpperCase();

    if (!ROOM_CODE_REGEX.test(code)) {
      this.error.set('Code invalide. Vérifie les 6 caractères.');
      return;
    }

    this.ui.joinWaitingRoom(code);
    void this.router.navigateByUrl(`/room/${code}`);
    this.form.reset();
  }

  private async tryResumeSession(): Promise<void> {
    if (!this.sessionToken.hasValidSession()) {
      return;
    }

    this.isResuming.set(true);

    await this.waitForSocket();

    const response = await this.reconnect.reconnect();
    if (response) {
      await this.reconnect.resumeAndNavigate(response);
    }

    this.isResuming.set(false);
  }

  private waitForSocket(): Promise<void> {
    if (this.socket.isConnected()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.socket.isConnected()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 3000);
    });
  }
}
