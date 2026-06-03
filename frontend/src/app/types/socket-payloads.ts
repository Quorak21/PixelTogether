import { GridPrivacy } from './entities';

export interface AuthenticatedPayload {
  pseudo: string;
  gridID: string | null;
  gridName?: string | null;
  userImg?: string | null;
  gold?: number;
}

export interface NewGridPayload {
  width: number;
  height: number;
  name: string;
  type: GridPrivacy;
}

export interface NewGridResponse {
  id?: string;
  host?: string;
  name?: string;
  error?: string;
}

export interface ResumeGridResponse {
  id?: string;
  host?: string;
  name?: string;
  error?: string;
}

export interface InvitePlayerResponse {
  success?: string;
  error?: string;
}

export interface BuyColorResponse {
  success: boolean;
  gold?: number;
  message?: string;
}

export interface PixelPlacedResponse {
  gold: number;
}
