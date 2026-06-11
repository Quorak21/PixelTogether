import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';

const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

@Component({
  selector: 'app-join-room-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './join-room-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRoomModalComponent {
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal('');

  constructor() {
    effect(() => {
      const externalError = this.ui.joinRoomError();
      if (this.ui.joinRoomOpen() && externalError) {
        this.error.set(externalError);
        this.ui.joinRoomError.set(null);
      }
    });
  }

  readonly form = this.fb.nonNullable.group({
    code: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^[A-Za-z2-9]{6}$/)],
    ],
  });

  close(): void {
    this.error.set('');
    this.ui.joinRoomOpen.set(false);
  }

  joinRoom(): void {
    if (this.form.invalid) {
      return;
    }

    this.error.set('');
    const code = this.form.controls.code.value.trim().toUpperCase();

    if (!ROOM_CODE_REGEX.test(code)) {
      this.error.set('Code invalide. Vérifie les 6 caractères.');
      return;
    }

    this.ui.joinRoomOpen.set(false);
    this.ui.joinWaitingRoom(code);
    this.router.navigateByUrl(`/room/${code}`);
    this.form.reset();
  }
}
