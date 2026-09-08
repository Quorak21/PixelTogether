import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-mentions-page',
  imports: [RouterLink, LucideArrowLeft],
  templateUrl: './mentions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentionsPageComponent {}
