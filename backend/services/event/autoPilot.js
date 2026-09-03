import * as store from '../../store/eventStore.js';
import * as lifecycle from './lifecycle.js';
import * as preview from '../grid/preview.js';
import * as constants from '../../config/constants.js';
import { isManagerConnected } from './participants.js';
import { isCoop } from './gameMode.js';
import {
  closeVote,
  emitVoteStateUpdated,
  finishTiebreakRoulette,
  isLastVote,
  openResults,
  startTiebreakRoulette,
} from '../vote/voteLifecycle.js';
import { runStartGame } from '../session/sessionLifecycle.js';
import { getOrBuildExportZip } from '../export/sessionZip.js';
import { clearPartyChat } from '../chat/partyChat.js';

const {
  AUTO_VOTE_CLOSE_MS,
  AUTO_TIEBREAK_ROULETTE_MS,
  AUTO_SESSION_START_MS,
  AUTO_PODIUM_END_MS,
} = constants;

function buildDeps(io) {
  return { io, store, lifecycle, preview, constants };
}

export function clearAutoPilotTimers(event) {
  if (event._autoPilotTimer) {
    clearTimeout(event._autoPilotTimer);
    event._autoPilotTimer = null;
  }
}

export function disableAutoPilot(event) {
  clearAutoPilotTimers(event);
  if (event.autoPilot) {
    event.autoPilot.active = false;
  }
}

function ensureAutoPilot(event) {
  if (!event.autoPilot) {
    event.autoPilot = { active: true };
  } else {
    event.autoPilot.active = true;
  }
}

function scheduleTimer(event, delayMs, fn) {
  clearAutoPilotTimers(event);
  event._autoPilotTimer = setTimeout(fn, delayMs);
}

/** Appelé après ouverture d'un vote si le manager est déjà absent. */
export function onVotePhaseOpened(io, event) {
  if (isCoop(event) || isManagerConnected(event)) return;
  ensureAutoPilot(event);
  syncAutoPilot(io, event, event.id, buildDeps(io));
}

/** Annule le pilote auto quand le manager revient. */
export function onManagerReconnected(io, event, eventId, deps) {
  event.coopManagerAbsent = false;

  if (isCoop(event)) {
    io.to(eventId).emit('managerAbsentCleared', { eventId, roomId: eventId });
    return;
  }

  const vote = event.activeVote;
  if (vote?.status === 'tiebreak_roulette') {
    vote.status = 'tiebreak';
    vote.winnerGroupCode = null;
    vote.rouletteStartedAt = null;
    vote.rouletteDurationMs = null;
  }

  disableAutoPilot(event);
  emitVoteStateUpdated(io, event);
  io.to(eventId).emit('managerAbsentCleared', { eventId, roomId: eventId });
}

/** Notifie les clients et planifie le pilote auto après déco manager. */
export function enableAutoPilotOnManagerDisconnect(io, event, eventId, deps) {
  if (isCoop(event) || isManagerConnected(event)) return;
  ensureAutoPilot(event);
  const resolvedDeps = deps ?? buildDeps(io);
  syncAutoPilot(io, event, eventId, resolvedDeps);

  if (event.showingResults) {
    void getOrBuildExportZip(event).catch(() => {});
  }

  emitVoteStateUpdated(io, event);
}

export function syncAutoPilot(io, event, eventId, deps) {
  if (isCoop(event) || !event.autoPilot?.active || isManagerConnected(event)) {
    return;
  }

  const { activeEvents } = store;

  // Podium en premier : activeVote peut être absent ou closed
  if (event.showingResults) {
    schedulePodiumEnd(io, event, eventId, deps, activeEvents);
    return;
  }

  const vote = event.activeVote;

  if (vote?.status === 'open') {
    scheduleVoteClose(io, event, eventId, deps, activeEvents);
    return;
  }

  if (vote?.status === 'tiebreak') {
    startTiebreakRoulette(event);
    emitVoteStateUpdated(io, event);
    scheduleRouletteFinish(io, event, eventId, deps, activeEvents);
    return;
  }

  if (vote?.status === 'tiebreak_roulette') {
    scheduleRouletteFinish(io, event, eventId, deps, activeEvents);
    return;
  }

  if (vote?.status === 'closed') {
    if (isLastVote(event)) {
      scheduleShowResults(io, event, eventId, deps, activeEvents);
    } else {
      scheduleSessionStart(io, event, eventId, deps, activeEvents);
    }
  }
}

function scheduleVoteClose(io, event, eventId, deps, activeEvents) {
  const deadline = Date.now() + AUTO_VOTE_CLOSE_MS;
  event.autoPilot.phase = 'vote';
  event.autoPilot.phaseDeadlineAt = deadline;
  const delay = Math.max(0, deadline - Date.now());

  scheduleTimer(event, delay, () => {
    event._autoPilotTimer = null;
    if (!activeEvents[eventId]) return;
    const ev = activeEvents[eventId];
    if (!ev.autoPilot?.active || isManagerConnected(ev)) return;
    if (ev.activeVote?.status !== 'open') return;

    const result = closeVote(ev);
    if (result.error) return;

    emitVoteStateUpdated(io, ev);

    if (result.roulette) {
      scheduleRouletteFinish(io, ev, eventId, deps, activeEvents);
    } else {
      syncAutoPilot(io, ev, eventId, deps);
    }
  });
}

function scheduleRouletteFinish(io, event, eventId, deps, activeEvents) {
  const startedAt = event.activeVote.rouletteStartedAt ?? Date.now();
  const durationMs = event.activeVote.rouletteDurationMs ?? AUTO_TIEBREAK_ROULETTE_MS;
  const endsAt = startedAt + durationMs;
  event.autoPilot.phase = 'roulette';
  event.autoPilot.phaseDeadlineAt = endsAt;
  const delay = Math.max(0, endsAt - Date.now());

  scheduleTimer(event, delay, () => {
    event._autoPilotTimer = null;
    if (!activeEvents[eventId]) return;
    const ev = activeEvents[eventId];
    if (!ev.autoPilot?.active || isManagerConnected(ev)) return;
    if (ev.activeVote?.status !== 'tiebreak_roulette') return;

    finishTiebreakRoulette(ev);
    emitVoteStateUpdated(io, ev);
    syncAutoPilot(io, ev, eventId, deps);
  });
}

function setPodiumAutoPilotDeadline(event) {
  const deadline = Date.now() + AUTO_PODIUM_END_MS;
  event.autoPilot.phase = 'podium';
  event.autoPilot.phaseDeadlineAt = deadline;
  return deadline;
}

function schedulePodiumCloseTimer(io, event, eventId, activeEvents) {
  scheduleTimer(event, AUTO_PODIUM_END_MS, () => {
    event._autoPilotTimer = null;
    if (!activeEvents[eventId]) return;
    const ev = activeEvents[eventId];
    if (!ev.autoPilot?.active || isManagerConnected(ev)) return;
    if (!ev.showingResults) return;

    lifecycle.closeEvent(io, eventId);
  });
}

function scheduleSessionStart(io, event, eventId, deps, activeEvents) {
  const deadline = Date.now() + AUTO_SESSION_START_MS;
  event.autoPilot.phase = 'sessionStart';
  event.autoPilot.phaseDeadlineAt = deadline;
  const delay = Math.max(0, deadline - Date.now());

  scheduleTimer(event, delay, () => {
    event._autoPilotTimer = null;
    if (!activeEvents[eventId]) return;
    const ev = activeEvents[eventId];
    if (!ev.autoPilot?.active || isManagerConnected(ev)) return;
    if (ev.activeVote?.status !== 'closed' || ev.showingResults) return;

    const result = runStartGame(io, ev, deps);
    if (result.error) return;
    clearAutoPilotTimers(ev);
    syncAutoPilot(io, ev, eventId, deps);
  });
}

function scheduleShowResults(io, event, eventId, deps, activeEvents) {
  const result = openResults(event);
  if (result.error) {
    return;
  }

  clearPartyChat(io, event);
  void getOrBuildExportZip(event).catch(() => {});

  setPodiumAutoPilotDeadline(event);
  emitVoteStateUpdated(io, event);
  schedulePodiumCloseTimer(io, event, eventId, activeEvents);
}

function schedulePodiumEnd(io, event, eventId, deps, activeEvents) {
  setPodiumAutoPilotDeadline(event);
  schedulePodiumCloseTimer(io, event, eventId, activeEvents);
}
