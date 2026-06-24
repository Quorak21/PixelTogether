import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { SessionTokenService } from '../../../core/services/session-token.service';
import { ReconnectService } from '../../../core/services/reconnect.service';
import {
  COOP_GUESTS_MIN,
  COOP_GRID_MAX,
  COOP_SESSION_COUNT_MAX,
  COOP_SESSION_COUNT_MIN,
  COMPETITIVE_PLAYERS_MIN,
  COMPETITIVE_SESSION_COUNT_MAX,
  COMPETITIVE_SESSION_COUNT_MIN,
  GAME_MODE_COOP,
  GAME_MODE_COMPETITIVE,
  SESSION_COUNT_DEFAULT,
  SESSION_DURATION_DEFAULT,
  SESSION_DURATION_MAX,
  SESSION_DURATION_MIN,
  coopGridOccupancy,
  totalPlayDurationMinutes,
} from '../../../core/config/session-config';
import { GameMode } from '../../../types/entities';
import { NewGridPayload, NewGridResponse } from '../../../types/socket-payloads';
import { preloadGameRoutes } from '../../../core/utils/preload-game';

@Component({
  selector: 'app-party-creation-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './party-creation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyCreationModalComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly reconnect = inject(ReconnectService);

  readonly error = signal('');
  readonly isSubmitting = signal(false);
  readonly COMPETITIVE_PLAYERS_MIN = COMPETITIVE_PLAYERS_MIN;

  readonly sessionDurationMin = SESSION_DURATION_MIN;
  readonly sessionDurationMax = SESSION_DURATION_MAX;

  readonly form = this.fb.nonNullable.group({
    partyName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    sessionCount: [SESSION_COUNT_DEFAULT, [Validators.required]],
    sessionDurationMinutes: [
      SESSION_DURATION_DEFAULT,
      [
        Validators.required,
        Validators.min(SESSION_DURATION_MIN),
        Validators.max(SESSION_DURATION_MAX),
      ],
    ],
    themes: this.fb.nonNullable.array([this.createThemeControl()]),
  });

  readonly creationMode = computed(() => this.ui.partyCreationMode());

  readonly isCoop = computed(() => this.creationMode() === GAME_MODE_COOP);

  readonly modalTitle = computed(() =>
    this.isCoop() ? 'Nouvelle partie coopérative' : 'Nouvelle partie compétitive',
  );

  readonly sessionCountMin = computed(() =>
    this.isCoop() ? COOP_SESSION_COUNT_MIN : COMPETITIVE_SESSION_COUNT_MIN,
  );

  readonly sessionCountMax = computed(() =>
    this.isCoop() ? COOP_SESSION_COUNT_MAX : COMPETITIVE_SESSION_COUNT_MAX,
  );

  readonly coopPlayersHint = computed(() =>
    this.isCoop()
      ? `${COOP_GUESTS_MIN} à ${COOP_GRID_MAX - 1} invités + vous (${COOP_GRID_MAX} sur la grille)`
      : '',
  );

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status },
  );

  readonly totalDurationMinutes = computed(() => {
    this.formValues();
    if (this.isCoop()) return 0;
    return totalPlayDurationMinutes(
      this.form.controls.sessionCount.value,
      this.form.controls.sessionDurationMinutes.value,
    );
  });

  readonly canSubmit = computed(() => {
    this.formValues();
    this.formStatus();
    this.creationMode();
    return this.form.valid && !this.isSubmitting();
  });

  constructor() {
    effect(() => {
      if (!this.ui.partyCreationOpen()) return;
      preloadGameRoutes();
      this.applyModeDefaults(this.ui.partyCreationMode());
    });

    this.form.controls.sessionCount.valueChanges.subscribe((count) => {
      this.syncThemeFields(count);
    });
  }

  get themes(): FormArray<FormControl<string>> {
    return this.form.controls.themes;
  }

  isInvalid(name: 'partyName' | 'sessionCount' | 'sessionDurationMinutes'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  isThemeInvalid(index: number): boolean {
    const control = this.themes.at(index);
    return control.invalid && (control.dirty || control.touched);
  }

  themePlaceholder(index: number): string {
    const placeholders = ['Un paysage', "L'océan", 'Un salon', 'Un poisson'];
    return placeholders[index] ?? '';
  }

  async createParty(): Promise<void> {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const mode: GameMode = this.creationMode();
    const payload: NewGridPayload = {
      partyName: this.form.controls.partyName.value,
      sessionCount: this.form.controls.sessionCount.value,
      themes: this.themes.getRawValue(),
      gameMode: mode,
      token: this.sessionToken.read()?.token,
    };

    if (mode === GAME_MODE_COMPETITIVE) {
      payload.sessionDurationMinutes = this.form.controls.sessionDurationMinutes.value;
    }

    let response: NewGridResponse;
    try {
      response = await this.socket.emitWithAck<NewGridPayload, NewGridResponse>('newGrid', payload);
    } catch {
      this.error.set('Une erreur est survenue. Veuillez réessayer.');
      this.isSubmitting.set(false);
      return;
    }

    if (response.error || !response.id || response.role !== 'manager') {
      this.error.set(response.error ?? 'Erreur lors de la création de la partie.');
      this.isSubmitting.set(false);
      return;
    }

    this.reconnect.saveFromNewGrid(response);
    this.ui.setPartyGameMode(mode);

    this.ui.partyCreationOpen.set(false);
    this.ui.setRole('manager');
    this.ui.joinWaitingRoom(response.id);
    void this.router.navigateByUrl(`/room/${response.id}`);
    this.isSubmitting.set(false);
  }

  private applyModeDefaults(mode: GameMode): void {
    const isCoop = mode === GAME_MODE_COOP;
    const countMin = isCoop ? COOP_SESSION_COUNT_MIN : COMPETITIVE_SESSION_COUNT_MIN;
    const countMax = isCoop ? COOP_SESSION_COUNT_MAX : COMPETITIVE_SESSION_COUNT_MAX;
    const defaultCount = isCoop ? COOP_SESSION_COUNT_MIN : COMPETITIVE_SESSION_COUNT_MIN;

    this.form.controls.sessionCount.setValidators([
      Validators.required,
      Validators.min(countMin),
      Validators.max(countMax),
    ]);

    if (isCoop) {
      this.form.controls.sessionDurationMinutes.clearValidators();
    } else {
      this.form.controls.sessionDurationMinutes.setValidators([
        Validators.required,
        Validators.min(SESSION_DURATION_MIN),
        Validators.max(SESSION_DURATION_MAX),
      ]);
    }

    this.form.controls.sessionCount.setValue(defaultCount);
    this.form.controls.sessionDurationMinutes.updateValueAndValidity();
    this.form.controls.sessionCount.updateValueAndValidity();
    this.syncThemeFields(defaultCount);
  }

  private createThemeControl(): FormControl<string> {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
    ]);
  }

  private syncThemeFields(count: number): void {
    const min = this.sessionCountMin();
    const max = this.sessionCountMax();
    const safeCount = Math.min(max, Math.max(min, count));
    while (this.themes.length < safeCount) {
      this.themes.push(this.createThemeControl());
    }
    while (this.themes.length > safeCount) {
      this.themes.removeAt(this.themes.length - 1);
    }
  }
}
