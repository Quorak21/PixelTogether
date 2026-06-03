import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-end-screen-modal',
  templateUrl: './end-screen-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndScreenModalComponent {
  readonly image = input('');
  readonly cancel = output<void>();
  readonly confirm = output<boolean>();
}
