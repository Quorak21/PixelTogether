import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { NewGridPayload, NewGridResponse } from '../../../types/socket-payloads';

@Component({
  selector: 'app-grid-creation-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './grid-creation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridCreationModalComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal('');
  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
  });

  async createNewGrid(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const payload: NewGridPayload = {
      name: this.form.controls.name.value,
    };

    const response = await this.socket.emitWithAck<NewGridPayload, NewGridResponse>('newGrid', payload);

    if (response.error || !response.id || response.role !== 'host') {
      this.error.set(response.error ?? 'Erreur lors de la création de la grille.');
      this.isSubmitting.set(false);
      return;
    }

    this.ui.gridCreationOpen.set(false);
    this.ui.setRole('host');
    this.ui.joinGame(response.id);
    this.router.navigateByUrl(`/game/${response.id}`);
    this.isSubmitting.set(false);
  }
}
