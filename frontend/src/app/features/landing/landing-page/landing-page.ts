import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideCrown, LucideUsers } from '@lucide/angular';
import { UiStateService } from '../../../core/services/ui-state.service';
import { PartyCreationModalComponent } from '../party-creation-modal/party-creation-modal';

const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export type InfoModalKind = 'why' | 'docs';

// entrée app : formulaire join inline + modale création (pas de socket ici)
@Component({
  selector: 'app-landing-page',
  imports: [PartyCreationModalComponent, ReactiveFormsModule, LucideCrown, LucideUsers],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal('');
  readonly infoModal = signal<InfoModalKind | null>(null);

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

  openInfoModal(kind: InfoModalKind): void {
    this.infoModal.set(kind);
  }

  closeInfoModal(): void {
    this.infoModal.set(null);
  }

  openCreateModal(): void {
    this.ui.partyCreationOpen.set(true);
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

    this.ui.joinWaitingRoom(code);
    void this.router.navigateByUrl(`/room/${code}`);
    this.form.reset();
  }
}
