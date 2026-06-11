import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

// partage URL/code — pas de socket, juste clipboard
@Component({
  selector: 'app-invite-modal',
  templateUrl: './invite-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteModalComponent {
  readonly open = input.required<boolean>();
  readonly roomCode = input.required<string>();
  readonly roomUrl = input.required<string>();

  readonly closed = output<void>();

  readonly copiedUrl = signal(false);
  readonly copiedCode = signal(false);
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  close(): void {
    this.closed.emit();
  }

  async copyUrl(): Promise<void> {
    await this.copyToClipboard(this.roomUrl(), 'url');
  }

  async copyCode(): Promise<void> {
    await this.copyToClipboard(this.roomCode(), 'code');
  }

  private async copyToClipboard(text: string, target: 'url' | 'code'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedUrl.set(target === 'url');
      this.copiedCode.set(target === 'code');

      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
      }

      this.copyResetTimer = setTimeout(() => {
        this.copiedUrl.set(false);
        this.copiedCode.set(false);
        this.copyResetTimer = null;
      }, 2000);
    } catch {
      // Clipboard unavailable
    }
  }
}
