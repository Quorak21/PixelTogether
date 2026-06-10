import {
  ROOM_CODE_CHARS,
  GROUP_CODE_CHARS,
  ROOM_CODE_LENGTH,
  GROUP_CODE_LENGTH,
  ROOM_CODE_REGEX,
  GROUP_CODE_REGEX,
} from '../config/constants.js';

export const activeEvents = {};

export function generateRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (activeEvents[code]);
  return code;
}

export function generateGroupCode(event) {
  let code;
  do {
    code = '';
    for (let i = 0; i < GROUP_CODE_LENGTH; i += 1) {
      code += GROUP_CODE_CHARS[Math.floor(Math.random() * GROUP_CODE_CHARS.length)];
    }
  } while (event.groups[code]);
  return code;
}

export function normalizeEventId(eventId) {
  if (typeof eventId !== 'string') return null;
  const normalized = eventId.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

export function normalizeGroupCode(groupCode) {
  if (typeof groupCode !== 'string') return null;
  const normalized = groupCode.trim();
  if (!GROUP_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

export function groupRoomName(eventId, groupCode) {
  return `${eventId}:${groupCode}`;
}

export function getEvent(eventId) {
  const id = normalizeEventId(eventId);
  return id ? activeEvents[id] : null;
}

export function getGroup(event, groupCode) {
  const code = normalizeGroupCode(groupCode);
  return code ? event?.groups?.[code] : null;
}

export function getSortedGroups(event) {
  return Object.entries(event.groups)
    .map(([groupCode, group]) => ({ groupCode, group }))
    .sort((a, b) => a.group.groupIndex - b.group.groupIndex);
}
