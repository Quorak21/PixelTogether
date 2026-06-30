import { isCoop } from '../event/gameMode.js';
import { buildTopGrids, buildTopPlayers } from '../vote/voteLifecycle.js';

/** Nom de fichier sûr (accents retirés, espaces → tirets). */
export function slugify(value) {
  if (typeof value !== 'string' || !value.trim()) return 'sans-nom';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'sans-nom';
}

/**
 * Construit les données du récap à partir de l'event en mémoire.
 */
export function buildRecapData(event) {
  const coop = isCoop(event);
  const sessions = (event.sessionArchive ?? []).map((session) => {
    const groups = [...(session.groups ?? [])];
    if (!coop) {
      groups.sort((a, b) => b.voteCount - a.voteCount);
    }
    return {
      sessionNumber: session.sessionNumber,
      theme: session.theme,
      groups: groups.map((group) => ({
        label: group.label,
        voteCount: group.voteCount ?? 0,
        players: (group.players ?? []).map((p) => p.pseudo),
      })),
    };
  });

  const data = {
    mode: coop ? 'coop' : 'competitive',
    partyName: event.partyName ?? 'Partie',
    participants: (event.players ?? []).map((p) => p.pseudo),
    sessions,
  };

  if (!coop) {
    data.topGrids = buildTopGrids(event, 3).map((g) => ({
      rank: g.rank,
      theme: g.theme,
      label: extractGroupLabel(g.label),
      voteCount: g.voteCount,
    }));
    data.topPlayers = buildTopPlayers(event, 10).map((p) => ({
      rank: p.rank,
      pseudo: p.pseudo,
      voteTotal: p.voteTotal,
    }));
  }

  return data;
}

/** Extrait « Groupe B » depuis « Groupe B — Session 2 ». */
function extractGroupLabel(compositeLabel) {
  if (typeof compositeLabel !== 'string') return 'Groupe';
  const idx = compositeLabel.indexOf(' — Session');
  return idx >= 0 ? compositeLabel.slice(0, idx) : compositeLabel;
}

/**
 * Rend le récap en texte brut UTF-8.
 */
export function renderRecapTxt(data) {
  const lines = [];
  const modeLabel = data.mode === 'coop' ? 'Coopératif' : 'Compétitif';

  lines.push('PixelTogether — Récapitulatif de partie');
  lines.push(`Partie : ${data.partyName}`);
  lines.push(`Mode : ${modeLabel}`);
  lines.push('');

  if (data.mode === 'coop') {
    lines.push('Participants :');
    lines.push(`  ${data.participants.join(', ')}`);
    lines.push('');

    for (const session of data.sessions) {
      lines.push(`── Session ${session.sessionNumber} ──`);
      lines.push(`Thème : ${session.theme}`);
    }
    return lines.join('\n');
  }

  for (const session of data.sessions) {
    lines.push(`── Session ${session.sessionNumber} ──`);
    lines.push(`Thème : ${session.theme}`);
    lines.push('');
    lines.push('Groupes :');

    session.groups.forEach((group, index) => {
      lines.push(`  ${index + 1}. ${group.label} — ${group.voteCount} vote${group.voteCount > 1 ? 's' : ''}`);
      lines.push(`     Joueurs : ${group.players.join(', ')}`);
    });
    lines.push('');
  }

  lines.push('── Classement final ──');
  lines.push('');
  lines.push('Top dessins :');

  for (const grid of data.topGrids ?? []) {
    lines.push(
      `  ${grid.rank}. Thème : ${grid.theme} - ${grid.label} — ${grid.voteCount} vote${grid.voteCount > 1 ? 's' : ''}`,
    );
  }

  lines.push('');
  lines.push('Top joueurs :');

  for (const player of data.topPlayers ?? []) {
    lines.push(
      `  ${player.rank}. ${player.pseudo} — ${player.voteTotal} vote${player.voteTotal > 1 ? 's' : ''}`,
    );
  }

  return lines.join('\n');
}
