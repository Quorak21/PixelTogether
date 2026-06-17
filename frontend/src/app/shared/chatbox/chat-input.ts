import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule],
  templateUrl: './chat-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInputComponent {
  private readonly socket = inject(SocketService);


  readonly eventId = input.required<string>();
  readonly groupCode = input.required<string>();

  readonly isOffline = computed(() => !this.socket.isConnected());

  inputValue = '';

  sendMessage(): void {
    if (!this.socket.isConnected() || !this.inputValue.trim()) {
      return;
    }
    this.socket.emit('sendMessage', {
      eventId: this.eventId(),
      groupCode: this.groupCode(),
      message: this.inputValue,
    });
    this.inputValue = '';
  }
}
