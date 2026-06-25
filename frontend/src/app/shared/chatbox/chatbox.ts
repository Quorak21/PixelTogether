import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  Input,
  signal,
  viewChild,
  booleanAttribute,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';

export type ChatScope = 'group' | 'party';

interface ChatMessage {
  senderId?: string;
  socketId: string;
  pseudo: string;
  message: string;
  role?: string;
}

@Component({
  selector: 'app-chatbox',
  imports: [FormsModule],
  templateUrl: './chatbox.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatboxComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly scope = input<ChatScope>('group');
  readonly eventId = input.required<string>();
  readonly groupCode = input('');
  @Input({ transform: booleanAttribute }) hideFooter = false;
  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  readonly chatMessages = signal<ChatMessage[]>([]);
  inputValue = '';

  constructor() {
    const onChatMessages = (data: ChatMessage[]) => this.chatMessages.set(data ?? []);
    const onReceiveMessage = (data: ChatMessage) =>
      this.chatMessages.update((prev) => [
        ...prev,
        { ...data, pseudo: data.pseudo ?? 'Joueur' },
      ]);

    this.destroyRef.onDestroy(this.socket.on<ChatMessage[]>('chatMessages', onChatMessages));
    this.destroyRef.onDestroy(this.socket.on<ChatMessage>('receiveMessage', onReceiveMessage));

    effect(() => {
      this.chatMessages();
      this.scrollToBottom();
    });

    effect(() => {
      this.scope();
      this.eventId();
      this.groupCode();
      this.fetchMessages();
    });
  }

  isManagerMessage(msg: ChatMessage): boolean {
    return msg.role === 'manager';
  }

  sendMessage(): void {
    if (!this.inputValue.trim()) {
      return;
    }
    this.socket.emit('sendMessage', {
      ...this.chatPayload(),
      message: this.inputValue,
    });
    this.inputValue = '';
    this.scrollToBottom();
  }

  private chatPayload(): { eventId: string; scope?: ChatScope; groupCode?: string } {
    const payload: { eventId: string; scope?: ChatScope; groupCode?: string } = {
      eventId: this.eventId(),
    };
    if (this.scope() === 'party') {
      payload.scope = 'party';
      return payload;
    }
    payload.groupCode = this.groupCode();
    return payload;
  }

  private fetchMessages(): void {
    if (this.scope() === 'group' && !this.groupCode()) {
      return;
    }
    this.socket.emit('getChatMessages', this.chatPayload());
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      this.messagesEnd()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
