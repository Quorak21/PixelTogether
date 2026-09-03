import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { UiStateService } from '../../core/services/ui-state.service';
import { formatRemainingMs } from '../../core/utils/time';


@Component({
  selector: 'app-session-timer-badge',
  templateUrl: './session-timer-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTimerBadgeComponent {
  private readonly ui = inject(UiStateService);

  /** Timestamp courant — mis à jour uniquement quand un timer actif est affiché. */
  private readonly now = signal(Date.now());

  /** Vrai si un chrono de session doit être visible (jeu ou supervision lobby). */
  readonly showTimer = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return false;
    return this.ui.gameMode() || this.ui.partyStarted();
  });

  /** Libellé formaté du temps restant (ex: « 04:32 »). */
  readonly sessionTimerLabel = computed(() => {
    if (!this.showTimer()) return null;
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return null;
    return formatRemainingMs(endsAt - this.now());
  });

  readonly sessionTimerUrgent = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return false;
    return endsAt - this.now() <= 60_000;
  });

  readonly sessionTimerWarning = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return false;
    const remaining = endsAt - this.now();
    return remaining > 60_000 && remaining <= 300_000;
  });

  readonly timerColorClasses = computed(() => {
    if (this.sessionTimerUrgent()) {
      return 'border-brand-coral/70 bg-brand-coral/15 text-brand-coral shadow-[0_0_24px_rgba(244,63,94,0.35)]';
    }
    if (this.sessionTimerWarning()) {
      return 'border-warning/70 bg-warning/15 text-warning shadow-[0_0_24px_rgba(245,158,11,0.3)]';
    }
    return 'border-brand-violet/60 bg-brand-violet/15 text-[#A5B4FC] shadow-[0_0_16px_rgba(99,102,241,0.25)]';
  });

  constructor() {
    // Intervalle uniquement tant qu'un timer est affiché (pas de tick sur la landing).
    effect((onCleanup) => {
      const endsAt = this.ui.sessionEndsAt();
      const active = endsAt !== null && (this.ui.gameMode() || this.ui.partyStarted());
      if (!active) return;

      this.now.set(Date.now());
      const intervalId = window.setInterval(() => {
        this.now.set(Date.now());
      }, 1000);

      onCleanup(() => {
        window.clearInterval(intervalId);
      });
    });
  }
}
