import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { ChatScope } from './chatbox';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule],
  templateUrl: './chat-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInputComponent {
  private readonly socket = inject(SocketService);

  readonly scope = input<ChatScope>('group');
  readonly eventId = input.required<string>();
  readonly groupCode = input('');

  readonly isOffline = computed(() => !this.socket.isConnected());

  inputValue = '';

  sendMessage(): void {
    if (!this.socket.isConnected() || !this.inputValue.trim()) {
      return;
    }
    const payload: { eventId: string; message: string; scope?: ChatScope; groupCode?: string } = {
      eventId: this.eventId(),
      message: this.inputValue,
    };
    if (this.scope() === 'party') {
      payload.scope = 'party';
    } else {
      payload.groupCode = this.groupCode();
    }
    this.socket.emit('sendMessage', payload);
    this.inputValue = '';
  }
}
