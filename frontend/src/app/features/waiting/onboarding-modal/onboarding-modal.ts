import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AVATAR_COLOR_ROWS, AVATAR_COLORS } from '../../../core/constants/avatar-colors';
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

  readonly avatarColorRows = AVATAR_COLOR_ROWS;
  readonly selectedAvatarColor = signal<string>(AVATAR_COLORS[0]);
  readonly isSubmitting = signal(false);
  readonly showErrors = signal(false);
  readonly formErrors = signal<string[]>([]);

  readonly form = this.fb.nonNullable.group({
    pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.showErrors.set(false);
      this.formErrors.set([]);
    });
  }

  selectColor(color: string): void {
    this.selectedAvatarColor.set(color);
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.showErrors.set(true);
      this.formErrors.set(this.collectFormErrors());
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

  private collectFormErrors(): string[] {
    const errors: string[] = [];
    const pseudo = this.form.controls.pseudo;

    if (pseudo.hasError('required')) {
      errors.push('Veuillez renseigner votre pseudo.');
    } else if (pseudo.hasError('minlength')) {
      errors.push('Le pseudo doit contenir au moins 3 caractères.');
    } else if (pseudo.hasError('maxlength')) {
      errors.push('Le pseudo ne peut pas dépasser 20 caractères.');
    }

    return errors;
  }

  private resetForm(): void {
    this.form.reset({ pseudo: '' });
    this.selectedAvatarColor.set(AVATAR_COLORS[0]);
    this.isSubmitting.set(false);
    this.showErrors.set(false);
    this.formErrors.set([]);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
