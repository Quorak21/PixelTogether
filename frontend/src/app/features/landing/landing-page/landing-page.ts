import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '../login-form/login-form';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-landing-page',
  imports: [LoginFormComponent],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/lobby');
    }
  }
}
