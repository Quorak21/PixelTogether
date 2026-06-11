import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// confirmation avant le tout premier startGame (sessions suivantes = direct)
@Component({
  selector: 'app-start-confirm-modal',
  templateUrl: './start-confirm-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartConfirmModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input('Démarrer la partie ?');
  readonly error = input<string>('');
  readonly isSubmitting = input(false);

  readonly confirmed = output<void>();
  readonly closed = output<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
