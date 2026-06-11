import { environment } from '../../../environments/environment';

// __PT_API_URL__ permet d'override l'URL socket en prod sans rebuild
export function getApiUrl(): string {
  const fromWindow = (globalThis as { __PT_API_URL__?: string }).__PT_API_URL__;

  if (fromWindow && fromWindow.trim().length > 0) {
    return fromWindow.trim();
  }

  return environment.apiUrl;
}
