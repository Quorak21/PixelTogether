const MANAGER_PLACEHOLDER = '{manager}';
const MANAGER_FALLBACK = 'Votre manager';

/** Pool de sous-titres WR — tirage aléatoire à chaque entrée en salle. */
export const WAITING_ROOM_SUBTITLE_TEMPLATES = [
  '{manager} a tranché : voici les chef-d\'œuvre imposés du jour.',
  '{manager} va tester votre esprit d\'équipe (et votre patience) avec ces thèmes.',
  'Inspiré par le dernier brief, {manager} vous a concocté ceci.',
  '{manager} a eu une vision (ou un excès de café) : place au pixel art.',
  'Alerte génie : {manager} a eu UNE idée, et c\'est tombé sur ces thèmes.',
  '{manager} a verrouillé le brief créatif. Spoiler : c\'est ambitieux.',
  '{manager} a sorti la liste. Pas de négociation, juste du pixel art.',
  '{manager} a planifié votre journée. Voici le programme imposé.',
  '{manager} a mis les thèmes dans l\'ordre. Votre mission : les sublimer.',
  '{manager} a fait les devoirs à votre place. À vous de dessiner.',
  '{manager} a préparé le menu. Entrée, plat, dessert : du pixel.',
  '{manager} a calé l\'agenda créatif de la journée. Bonne chance à tous.',
  '{manager} a arbitré. Ces thèmes ne se discutent pas — ils se dessinent.',
  '{manager} a pondu le planning. Vous n\'avez plus qu\'à exécuter (avec talent).',
  '{manager} a activé le mode « teambuilding ». Thèmes en approche.',
  '{manager} a rédigé le cahier des charges. Version artistique, bien sûr.',
  '{manager} a choisi. Vous allez découvrir si vous êtes vraiment une équipe.',
  '{manager} a parlé. Le reste, c\'est entre vous et les pixels.',
  '{manager} a lancé le défi. Ces thèmes ne se dessineront pas tout seuls.',
] as const;

export type ThemeScheduleStatus = 'upcoming' | 'current' | 'done';

export interface ThemeScheduleEntry {
  index: number;
  label: string;
  status: ThemeScheduleStatus;
}

function formatManagerName(managerPseudo: string | null | undefined): string {
  const trimmed = managerPseudo?.trim();
  return trimmed || MANAGER_FALLBACK;
}

export function pickWaitingRoomSubtitle(managerPseudo: string | null | undefined): string {
  const manager = formatManagerName(managerPseudo);
  const template =
    WAITING_ROOM_SUBTITLE_TEMPLATES[
      Math.floor(Math.random() * WAITING_ROOM_SUBTITLE_TEMPLATES.length)
    ];
  return template.replaceAll(MANAGER_PLACEHOLDER, manager);
}

export function buildThemeSchedule(
  themes: string[],
  currentSession: number,
  partyStarted: boolean,
): ThemeScheduleEntry[] {
  return themes.map((label, index) => {
    const sessionNumber = index + 1;
    let status: ThemeScheduleStatus = 'upcoming';
    if (partyStarted) {
      if (sessionNumber < currentSession) {
        status = 'done';
      } else if (sessionNumber === currentSession) {
        status = 'current';
      }
    }
    return { index: sessionNumber, label, status };
  });
}
