import { GRID_SIZE } from '../../config/constants.js';
import { generateGridImage } from './gridPreview.js';
import { getEvent, getGroup } from '../../store/eventStore.js';

export function updateGroupPreview(eventId, groupCode) {
  const event = getEvent(eventId);
  const group = getGroup(event, groupCode);
  if (!event || !group) return;
  group.image = generateGridImage(group.pixels, GRID_SIZE);
}

export function getEventGroupImages(event) {
  const images = {};
  for (const code in event.groups) {
    if (event.groups[code]?.image) {
      images[code] = event.groups[code].image;
    }
  }
  return images;
}
