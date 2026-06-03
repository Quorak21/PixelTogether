import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { InvitePlayerResponse } from '../../../types/socket-payloads';

@Component({
  selector: 'app-invite-window',
  imports: [CommonModule, ReactiveFormsModule, CdkDrag, CdkDragHandle],
  templateUrl: './invite-window.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InviteWindowComponent implements OnInit {
  private readonly socket = inject(SocketService);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly roomId = input.required<string>();
  readonly close = output<void>();

  readonly activeTab = signal<'invite' | 'invitedList'>('invite');
  readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly invitedUsers = signal<string[]>([]);
  readonly activePlayers = signal<string[]>([]);

  readonly form = this.fb.nonNullable.group({
    pseudo: ['', [Validators.required, Validators.minLength(3)]]
  });

  constructor() {
    const onPlayersList = (data: { invitedUsers: string[]; activePlayers: string[] }) => {
      this.invitedUsers.set(data.invitedUsers ?? []);
      this.activePlayers.set(data.activePlayers ?? []);
    };

    this.socket.on<{ invitedUsers: string[]; activePlayers: string[] }>('playersList', onPlayersList);

    this.destroyRef.onDestroy(() => {
      this.socket.off('playersList', onPlayersList as (...args: unknown[]) => void);
    });
  }

  ngOnInit(): void {
    this.socket.emit('getPlayersList', { roomId: this.roomId() });
  }

  invitedCount(): number {
    return Math.max(0, this.invitedUsers().length - 1);
  }

  statusClasses(): string {
    const base = 'mt-4 p-3 rounded-lg text-sm font-medium text-center animate-fade-in-up border';
    if (this.statusMessage()?.type === 'error') {
      return `${base} bg-error/10 text-error border-error/20`;
    }
    return `${base} bg-success/10 text-success border-success/20`;
  }

  async handleInvite(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const pseudo = this.form.controls.pseudo.value.trim();
    const response = await this.socket.emitWithAck<{ roomId: string; pseudo: string }, InvitePlayerResponse>(
      'invitePlayer',
      { roomId: this.roomId(), pseudo }
    );

    if (response.error) {
      this.statusMessage.set({ type: 'error', text: response.error });
      return;
    }

    this.statusMessage.set({ type: 'success', text: response.success ?? 'Invitation envoyee' });
    this.invitedUsers.update((users) => [...users, pseudo]);
    this.form.controls.pseudo.setValue('');
  }
}
