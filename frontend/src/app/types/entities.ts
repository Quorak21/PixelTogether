export type GridPrivacy = 'public' | 'limited' | 'private';

export interface UserSession {
  pseudo: string;
  gridID: string | null;
  gridName?: string | null;
  userImg?: string | null;
}

export interface LobbyRoom {
  id: string;
  host: string;
  pseudo: string;
  name: string;
  width: number;
  height: number;
  playersList: string[];
  type: GridPrivacy;
}

export interface GalleryGrid {
  id: string;
  name: string;
  image: string;
  likes: number;
  author: string;
  date: number;
  liked: boolean;
  onGallery?: boolean;
}

export interface GridStatePayload {
  pixels: Record<string, string>;
  width: number;
  height: number;
  name: string;
  type: GridPrivacy;
}

export interface ActiveGridsPayload {
  activeGrids: Record<string, LobbyRoom>;
  images: Record<string, string>;
  gold: number;
}
