import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { ChatTypingPayload } from '../../types/socket-payloads';
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
    this.emitTyping(false);
  }

  onInputChange(): void {
    this.emitTyping(Boolean(this.inputValue.trim()));
  }

  onInputBlur(): void {
    this.emitTyping(false);
  }

  private emitTyping(active: boolean): void {
    if (this.scope() !== 'group' || !this.groupCode()) {
      return;
    }
    const payload: ChatTypingPayload = {
      eventId: this.eventId(),
      groupCode: this.groupCode(),
      active,
    };
    this.socket.emit('chatTyping', payload);
  }
}
