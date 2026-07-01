import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideUser } from '@lucide/angular';

@Component({
  selector: 'app-avatar-placeholder',
  imports: [LucideUser],
  templateUrl: './avatar-placeholder.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPlaceholderComponent {
  readonly color = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Fantôme neutre pour visiteur en cours d'inscription. */
  readonly ghost = input(false);
}
