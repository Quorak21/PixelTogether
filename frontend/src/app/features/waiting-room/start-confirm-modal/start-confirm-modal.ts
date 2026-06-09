import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-start-confirm-modal',
  templateUrl: './start-confirm-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartConfirmModalComponent {
  readonly open = input.required<boolean>();
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
