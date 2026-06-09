import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-color-palette',
  templateUrl: './color-palette.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPaletteComponent {
  readonly ui = inject(UiStateService);

  selectColor(color: string): void {
    this.ui.setSelectedColor(color);
  }
}
