import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  Input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';

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
// chat scope groupe — monté uniquement sur game-page, pas de badge non-lus (cf backlog FRONT-05)
export class ChatboxComponent implements AfterViewInit {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventId = input.required<string>();
  readonly groupCode = input.required<string>();
  @Input({ transform: booleanAttribute }) hideFooter = false;
  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly managerSocketId = signal<string | null>(null);
  inputValue = '';

  constructor() {
    const onChatMessages = (data: ChatMessage[]) => this.chatMessages.set(data ?? []);
    const onReceiveMessage = (data: ChatMessage) =>
      this.chatMessages.update((prev) => [
        ...prev,
        { ...data, pseudo: data.pseudo ?? 'Joueur' },
      ]);
    const onPlayersList = (data: { activePlayers: string[]; managerSocketId: string }) => {
      this.managerSocketId.set(data.managerSocketId ?? null);
    };

    this.socket.on<ChatMessage[]>('chatMessages', onChatMessages);
    this.socket.on<ChatMessage>('receiveMessage', onReceiveMessage);
    this.socket.on<{ activePlayers: string[]; managerSocketId: string }>('playersList', onPlayersList);

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

  // manager peut spectater le groupe sans être dans group.players
  isManagerMessage(msg: ChatMessage): boolean {
    const managerId = this.managerSocketId();
    if (!managerId) {
      return false;
    }
    const authorId = msg.senderId ?? msg.socketId;
    return authorId === managerId;
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
