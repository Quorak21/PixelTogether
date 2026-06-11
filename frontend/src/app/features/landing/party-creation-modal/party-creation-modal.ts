import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import {
  MAX_PARTY_DURATION_MINUTES,
  SESSION_COUNT_DEFAULT,
  SESSION_COUNT_MAX,
  SESSION_COUNT_MIN,
  SESSION_DURATION_DEFAULT,
  SESSION_DURATION_MAX,
  SESSION_DURATION_MIN,
  totalPlayDurationMinutes,
} from '../../../core/config/session-config';
import { NewGridPayload, NewGridResponse } from '../../../types/socket-payloads';

// formulaire multi-sessions → newGrid — remplace l'ancien host/manager grid-creation
@Component({
  selector: 'app-party-creation-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './party-creation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyCreationModalComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal('');
  readonly isSubmitting = signal(false);

  readonly sessionDurationMin = SESSION_DURATION_MIN;
  readonly sessionDurationMax = SESSION_DURATION_MAX;
  readonly sessionCountMin = SESSION_COUNT_MIN;
  readonly sessionCountMax = SESSION_COUNT_MAX;
  readonly maxPartyDurationMinutes = MAX_PARTY_DURATION_MINUTES;

  readonly form = this.fb.nonNullable.group({
    partyName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    sessionCount: [
      SESSION_COUNT_DEFAULT,
      [Validators.required, Validators.min(SESSION_COUNT_MIN), Validators.max(SESSION_COUNT_MAX)],
    ],
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

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status },
  );

  readonly totalDurationMinutes = computed(() => {
    this.formValues();
    return totalPlayDurationMinutes(
      this.form.controls.sessionCount.value,
      this.form.controls.sessionDurationMinutes.value,
    );
  });

  readonly totalDurationExceeded = computed(
    () => this.totalDurationMinutes() > MAX_PARTY_DURATION_MINUTES,
  );

  readonly canSubmit = computed(() => {
    this.formValues();
    this.formStatus();
    return this.form.valid && !this.totalDurationExceeded() && !this.isSubmitting();
  });

  constructor() {
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

  // newGrid ack → nav WR — le manager doit encore registerPlayer avant startGame
  async createParty(): Promise<void> {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const payload: NewGridPayload = {
      partyName: this.form.controls.partyName.value,
      sessionCount: this.form.controls.sessionCount.value,
      themes: this.themes.getRawValue(),
      sessionDurationMinutes: this.form.controls.sessionDurationMinutes.value,
    };

    const response = await this.socket.emitWithAck<NewGridPayload, NewGridResponse>('newGrid', payload);

    if (response.error || !response.id || response.role !== 'manager') {
      this.error.set(response.error ?? 'Erreur lors de la création de la partie.');
      this.isSubmitting.set(false);
      return;
    }

    this.ui.partyCreationOpen.set(false);
    this.ui.setRole('manager');
    this.ui.joinWaitingRoom(response.id);
    void this.router.navigateByUrl(`/room/${response.id}`);
    this.isSubmitting.set(false);
  }

  private createThemeControl(): FormControl<string> {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
    ]);
  }

  // FormArray dynamique : 1 champ thème par session
  private syncThemeFields(count: number): void {
    const safeCount = Math.min(
      SESSION_COUNT_MAX,
      Math.max(SESSION_COUNT_MIN, count),
    );
    while (this.themes.length < safeCount) {
      this.themes.push(this.createThemeControl());
    }
    while (this.themes.length > safeCount) {
      this.themes.removeAt(this.themes.length - 1);
    }
  }
}
