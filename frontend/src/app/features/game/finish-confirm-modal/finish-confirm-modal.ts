import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-finish-confirm-modal',
  templateUrl: './finish-confirm-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinishConfirmModalComponent {
  readonly title = input('');
  readonly message = input('');
  readonly buttonText = input('');
  readonly buttonColor = input('bg-indigo-500 hover:bg-indigo-600');
  readonly cancel = output<void>();
  readonly confirm = output<void>();
}
