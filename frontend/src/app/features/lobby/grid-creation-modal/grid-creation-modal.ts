import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { HelpGridCreationComponent } from '../help-grid-creation/help-grid-creation';
import { NewGridPayload, NewGridResponse } from '../../../types/socket-payloads';

@Component({
  selector: 'app-grid-creation-modal',
  imports: [CommonModule, ReactiveFormsModule, HelpGridCreationComponent],
  templateUrl: './grid-creation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridCreationModalComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly showHelp = signal(false);
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    width: [40, [Validators.required, Validators.min(20), Validators.max(100)]],
    height: [40, [Validators.required, Validators.min(20), Validators.max(100)]],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    type: this.fb.nonNullable.control<'public' | 'limited' | 'private'>('public')
  });

  async createNewGrid(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const payload: NewGridPayload = {
      width: this.form.controls.width.value,
      height: this.form.controls.height.value,
      name: this.form.controls.name.value,
      type: this.form.controls.type.value
    };

    const response = await this.socket.emitWithAck<NewGridPayload, NewGridResponse>('newGrid', payload);

    if (response.error || !response.id || !response.host) {
      this.error.set(response.error ?? 'Erreur lors de la creation de la grille.');
      this.isSubmitting.set(false);
      return;
    }

    this.auth.setGridId(response.id);
    this.ui.gridCreationOpen.set(false);
    this.ui.joinGame(response.id, response.host);
    this.router.navigateByUrl(`/game/${response.id}`);
    this.isSubmitting.set(false);
  }
}
