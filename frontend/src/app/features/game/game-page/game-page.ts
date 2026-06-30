import {

  ChangeDetectionStrategy,

  Component,

  computed,

  DestroyRef,

  inject,

  signal,

} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { UiStateService } from '../../../core/services/ui-state.service';

import { ChatInputComponent } from '../../../shared/chatbox/chat-input';

import { ChatboxComponent } from '../../../shared/chatbox/chatbox';

import { CanvasComponent } from '../canvas/canvas';

import { ColorPaletteComponent } from '../color-palette/color-palette';

import { GroupTransitionModalComponent } from '../group-transition-modal/group-transition-modal';

import { SocketService } from '../../../core/services/socket.service';
import { SessionTokenService } from '../../../core/services/session-token.service';

import {

  GroupFinishedPayload,

  GroupFinishProgressPayload,

  MarkFinishedPayload,

  MarkFinishedResponse,

} from '../../../types/socket-payloads';



@Component({

  selector: 'app-game-page',

  imports: [

    CanvasComponent,

    ColorPaletteComponent,

    ChatboxComponent,

    ChatInputComponent,

    GroupTransitionModalComponent,

  ],

  templateUrl: './game-page.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class GamePageComponent {

  readonly ui = inject(UiStateService);

  private readonly socket = inject(SocketService);
  private readonly sessionToken = inject(SessionTokenService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);



  readonly eventId = signal(this.route.snapshot.paramMap.get('eventId')?.toUpperCase() ?? '');

  readonly groupCode = signal(this.route.snapshot.paramMap.get('groupCode') ?? '');

  readonly transitionActive = signal(Boolean(this.ui.groupTransition()));

  readonly isMarkingFinished = signal(false);

  readonly markFinishedError = signal('');



  readonly spectatorBar = computed(

    () =>

      this.ui.isCompetitiveParty() &&

      ((this.ui.isManager() && !this.ui.isCoopParty()) || this.ui.isSpectator()),

  );



  readonly showPlayerLayout = computed(() => !this.spectatorBar());



  readonly showFinishButton = computed(

    () =>

      this.ui.isCompetitiveParty() &&

      !this.ui.isManager() &&

      !this.ui.isSpectator() &&

      !this.ui.hasMarkedFinished(),

  );



  readonly finishButtonLabel = computed(() => {

    const finished = this.ui.groupFinishFinishedCount();

    const total = this.ui.groupFinishTotalCount();

    if (total > 0) {

      return `J'ai fini (${finished}/${total})`;

    }

    return "J'ai fini";

  });



  readonly showCanvasLoading = computed(

    () =>

      this.ui.gameCanvasLoading() &&

      !(this.transitionActive() && this.ui.groupTransition()),

  );



  constructor() {

    const eventId = this.eventId();

    const groupCode = this.groupCode();



    this.ui.currentEventId.set(eventId);

    this.ui.currentGroupCode.set(groupCode);

    this.ui.joinGame(eventId, groupCode);

    this.bindFinishListeners();

  }



  private bindFinishListeners(): void {

    const eventId = this.eventId();

    const groupCode = this.groupCode();



    const onProgress = (payload: GroupFinishProgressPayload) => {

      if (payload.eventId !== eventId || payload.groupCode !== groupCode) {

        return;

      }

      this.ui.setGroupFinishProgress(payload.finishedCount, payload.totalCount);

    };



    const onGroupFinished = (payload: GroupFinishedPayload) => {

      if (payload.eventId !== eventId || payload.groupCode !== groupCode) {

        return;

      }

      this.socket.emit('exitGame', { eventId, groupCode });

      this.sessionToken.clearGroupCode();

      this.ui.leaveGroupView(eventId);

      void this.router.navigateByUrl(`/lobby/${eventId}`);

    };



    this.socket.on<GroupFinishProgressPayload>('groupFinishProgress', onProgress);

    this.socket.on<GroupFinishedPayload>('groupFinished', onGroupFinished);



    this.destroyRef.onDestroy(() => {

      this.socket.off('groupFinishProgress', onProgress as (...args: unknown[]) => void);

      this.socket.off('groupFinished', onGroupFinished as (...args: unknown[]) => void);

    });

  }



  onTransitionDismissed(): void {

    this.transitionActive.set(false);

  }



  returnToLobby(): void {

    const eventId = this.eventId();

    const groupCode = this.groupCode();

    if (eventId && this.ui.isCompetitiveParty()) {

      this.socket.emit('exitGame', { eventId, groupCode });

      this.ui.leaveGroupView(eventId);

      void this.router.navigateByUrl(`/lobby/${eventId}`);

    }

  }



  async markFinished(): Promise<void> {

    const eventId = this.eventId();

    const groupCode = this.groupCode();

    if (!eventId || !groupCode || this.isMarkingFinished() || this.ui.hasMarkedFinished()) {

      return;

    }



    this.isMarkingFinished.set(true);

    this.markFinishedError.set('');



    try {

      const response = await this.socket.emitWithAck<MarkFinishedPayload, MarkFinishedResponse>(

        'markFinished',

        { eventId, groupCode },

      );



      if (response.error) {

        this.markFinishedError.set(response.error);

        this.isMarkingFinished.set(false);

        return;

      }



      if (response.finishedCount !== undefined && response.totalCount !== undefined) {

        this.ui.setGroupFinishProgress(response.finishedCount, response.totalCount);

      }

      this.ui.setHasMarkedFinished(true);

      this.ui.setCanDrawOnCanvas(false);

    } catch {

      this.markFinishedError.set('Une erreur est survenue. Veuillez réessayer.');

    }



    this.isMarkingFinished.set(false);

  }

}


