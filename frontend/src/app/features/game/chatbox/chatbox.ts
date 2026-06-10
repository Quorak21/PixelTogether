import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../core/services/socket.service';
import { UiStateService } from '../../../core/services/ui-state.service';

interface ChatMessage {
  senderId?: string;
  socketId: string;
  pseudo: string;
  message: string;
}

@Component({
  selector: 'app-chatbox',
  imports: [FormsModule],
  templateUrl: './chatbox.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatboxComponent implements AfterViewInit {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventId = input.required<string>();
  readonly groupCode = input.required<string>();
  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly hostSocketId = signal<string | null>(null);
  inputValue = '';

  constructor() {
    const onChatMessages = (data: ChatMessage[]) => this.chatMessages.set(data ?? []);
    const onReceiveMessage = (data: ChatMessage) =>
      this.chatMessages.update((prev) => [
        ...prev,
        { ...data, pseudo: data.pseudo ?? 'Joueur' },
      ]);
    const onPlayersList = (data: { activePlayers: string[]; hostSocketId: string }) => {
      this.hostSocketId.set(data.hostSocketId ?? null);
    };

    this.socket.on<ChatMessage[]>('chatMessages', onChatMessages);
    this.socket.on<ChatMessage>('receiveMessage', onReceiveMessage);
    this.socket.on<{ activePlayers: string[]; hostSocketId: string }>('playersList', onPlayersList);

    this.destroyRef.onDestroy(() => {
      this.socket.off('chatMessages', onChatMessages as (...args: unknown[]) => void);
      this.socket.off('receiveMessage', onReceiveMessage as (...args: unknown[]) => void);
      this.socket.off('playersList', onPlayersList as (...args: unknown[]) => void);
    });
  }

  ngAfterViewInit(): void {
    const payload = { eventId: this.eventId(), groupCode: this.groupCode() };
    this.socket.emit('getChatMessages', payload);
    this.socket.emit('getPlayersList', payload);
  }

  isHostMessage(msg: ChatMessage): boolean {
    const hostId = this.hostSocketId();
    if (!hostId) {
      return false;
    }
    const authorId = msg.senderId ?? msg.socketId;
    return authorId === hostId;
  }

  sendMessage(): void {
    if (!this.inputValue.trim()) {
      return;
    }
    this.socket.emit('sendMessage', {
      eventId: this.eventId(),
      groupCode: this.groupCode(),
      message: this.inputValue,
    });
    this.inputValue = '';
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      this.messagesEnd()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
