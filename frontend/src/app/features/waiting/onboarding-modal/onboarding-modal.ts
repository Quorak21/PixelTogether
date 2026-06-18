import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AVATAR_COLORS } from '../../../core/constants/avatar-colors';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

// pseudo + couleur avatar → emit vers waiting-room-page qui appelle registerPlayer
@Component({
  selector: 'app-onboarding-modal',
  imports: [ReactiveFormsModule, AvatarPlaceholderComponent],
  templateUrl: './onboarding-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input.required<boolean>();
  readonly isManager = input(false);
  readonly error = input<string>('');

  readonly submitProfile = output<{ pseudo: string; avatarColor: string }>();

  readonly avatarColors = AVATAR_COLORS;
  readonly selectedAvatarColor = signal<string>(AVATAR_COLORS[0]);
  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
  });

  selectColor(color: string): void {
    this.selectedAvatarColor.set(color);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitProfile.emit({
      pseudo: this.form.controls.pseudo.value.trim(),
      avatarColor: this.selectedAvatarColor(),
    });
  }

  // appelé par le parent si l'ack socket échoue (évite bouton bloqué)
  resetSubmitting(): void {
    this.isSubmitting.set(false);
  }
}
