import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';

export const SITE_ORIGIN = 'https://www.pixeltogether.ch';
const DEFAULT_DESCRIPTION =
  'Team building collaboratif en pixel-art. Palette exclusive par joueur, vote, zéro compte.';
const DEFAULT_ROBOTS = 'index,follow';

export const PRIVATE_SEO: SeoRouteData = {
  robots: 'noindex,nofollow',
  canonicalPath: '/',
};

export interface SeoRouteData {
  description?: string;
  robots?: string;
  canonicalPath?: string;
}

type VercelAnalyticsFn = (command: string, payload?: unknown) => void;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  /** Le script HTML compte déjà le 1er chargement. */
  private skipInitialPageview = true;

  constructor() {
    this.apply();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.apply();
        this.reportSpaPageview();
      }
    });
  }

  private reportSpaPageview(): void {
    if (this.skipInitialPageview) {
      this.skipInitialPageview = false;
      return;
    }
    if ((globalThis as { ngServerMode?: boolean }).ngServerMode) {
      return;
    }
    const va = (globalThis as { va?: VercelAnalyticsFn }).va;
    if (typeof va === 'function') {
      va('event', { type: 'pageview' });
    }
  }

  private apply(): void {
    const data = this.mergeRouteData();
    const description = data.description ?? DEFAULT_DESCRIPTION;
    const robots = data.robots ?? DEFAULT_ROBOTS;
    const canonical = this.canonicalUrl(data.canonicalPath);
    const pageTitle = this.routeTitle() ?? this.title.getTitle();
    this.title.setTitle(pageTitle);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.setCanonical(canonical);
  }

  private routeTitle(): string | undefined {
    let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let title: string | undefined;
    while (node) {
      const configured = node.routeConfig?.title;
      if (typeof configured === 'string') {
        title = configured;
      }
      node = node.firstChild;
    }
    return title;
  }

  private mergeRouteData(): SeoRouteData {
    let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    const data: SeoRouteData = {};
    while (node) {
      Object.assign(data, node.data);
      node = node.firstChild;
    }
    return data;
  }

  private canonicalUrl(path: string | undefined): string {
    const normalized = path && path.length > 0 ? path : '/';
    if (normalized === '/') {
      return `${SITE_ORIGIN}/`;
    }
    return `${SITE_ORIGIN}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  }

  private setCanonical(href: string): void {
    const doc = this.document;
    let link = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
