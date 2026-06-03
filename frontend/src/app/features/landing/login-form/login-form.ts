import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isRegistering = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = this.fb.nonNullable.group({
    pseudo: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]]
  });

  toggleRegister(): void {
    this.isRegistering.update((v) => !v);
    this.applyPasswordValidators(this.isRegistering());
    this.error.set('');
    this.success.set('');
    this.form.controls.password.setValue('');
  }

  private applyPasswordValidators(registering: boolean): void {
    const passwordControl = this.form.controls.password;
    passwordControl.setValidators(
      registering
        ? [Validators.required, Validators.minLength(6)]
        : [Validators.required]
    );
    passwordControl.updateValueAndValidity();
  }

  async handleSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');
    this.success.set('');

    const pseudo = this.form.controls.pseudo.value.trim();
    const password = this.form.controls.password.value;

    try {
      if (this.isRegistering()) {
        const message = await this.auth.register(pseudo, password);
        this.success.set(message);
        this.toggleRegister();
      } else {
        await this.auth.login(pseudo, password);
        this.router.navigateByUrl('/lobby');
      }
      this.form.controls.password.setValue('');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.error?.message) {
        this.error.set(error.error.message);
      } else if (error instanceof Error) {
        this.error.set(error.message);
      } else {
        this.error.set('Une erreur est survenue.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
