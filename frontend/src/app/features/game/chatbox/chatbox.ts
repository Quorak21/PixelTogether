import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { SocketService } from '../../../core/services/socket.service';
import { UiStateService } from '../../../core/services/ui-state.service';

interface ChatMessage {
  senderId?: string;
  pseudo: string;
  message: string;
  type?: 'message' | 'info';
}

@Component({
  selector: 'app-chatbox',
  imports: [FormsModule, CdkDrag, CdkDragHandle],
  templateUrl: './chatbox.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatboxComponent implements AfterViewInit {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly close = output<void>();
  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  readonly isMinimized = signal(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly userPanelOpen = signal(false);
  readonly playersList = signal<string[]>([]);
  readonly hostPseudo = signal<string | null>(null);
  inputValue = '';

  constructor() {
    const onChatMessages = (data: ChatMessage[]) => this.chatMessages.set(data ?? []);
    const onReceiveMessage = (data: ChatMessage) =>
      this.chatMessages.update((prev) => [...prev, { ...data, type: 'message' }]);
    const onJoinedRoom = (data: { pseudo: string; senderId?: string }) => {
      this.chatMessages.update((prev) => [
        ...prev,
        { senderId: data.senderId, pseudo: data.pseudo, type: 'info', message: 'a rejoint la partie.' }
      ]);
      this.socket.emit('getPlayersList', { roomId: this.roomId() });
    };
    const onExitGame = (data: { user: string; senderId?: string }) =>
      this.chatMessages.update((prev) => [
        ...prev,
        { senderId: data.senderId, pseudo: data.user, type: 'info', message: 'a quitte la partie.' }
      ]);
    const onPlayersList = (data: { activePlayers: string[]; hostPseudo: string }) => {
      this.playersList.set(data.activePlayers ?? []);
      this.hostPseudo.set(data.hostPseudo ?? null);
    };

    this.socket.on<ChatMessage[]>('chatMessages', onChatMessages);
    this.socket.on<ChatMessage>('receiveMessage', onReceiveMessage);
    this.socket.on<{ pseudo: string; senderId?: string }>('joinedRoom', onJoinedRoom);
    this.socket.on<{ user: string; senderId?: string }>('exitGame', onExitGame);
    this.socket.on<{ activePlayers: string[]; hostPseudo: string }>('playersList', onPlayersList);

    this.destroyRef.onDestroy(() => {
      this.socket.off('chatMessages', onChatMessages as (...args: unknown[]) => void);
      this.socket.off('receiveMessage', onReceiveMessage as (...args: unknown[]) => void);
      this.socket.off('joinedRoom', onJoinedRoom as (...args: unknown[]) => void);
      this.socket.off('exitGame', onExitGame as (...args: unknown[]) => void);
      this.socket.off('playersList', onPlayersList as (...args: unknown[]) => void);
    });
  }

  ngAfterViewInit(): void {
    this.socket.emit('getChatMessages', { roomId: this.roomId() });
  }

  sendMessage(): void {
    if (!this.inputValue.trim()) {
      return;
    }
    this.socket.emit('sendMessage', {
      roomId: this.roomId(),
      message: this.inputValue
    });
    this.inputValue = '';
    this.scrollToBottom();
  }

  toggleUserPanel(): void {
    this.userPanelOpen.set(!this.userPanelOpen());
    this.socket.emit('getPlayersList', { roomId: this.roomId() });
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      this.messagesEnd()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
