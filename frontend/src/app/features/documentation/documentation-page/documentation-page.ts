import { ChangeDetectionStrategy, Component, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { DOCUMENTATION_MARKDOWN } from '../documentation.content';
import { DOC_PAGE_TITLE } from '../documentation.constants';
import { DocTocEntry, parseDocumentation } from '../documentation.parse';

interface DocView {
  html: SafeHtml;
  toc: DocTocEntry[];
}

@Component({
  selector: 'app-documentation-page',
  imports: [RouterLink, LucideArrowLeft],
  templateUrl: './documentation-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentationPageComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly scrollContainer = viewChild.required<ElementRef<HTMLElement>>('scrollContainer');

  readonly docPageTitle = DOC_PAGE_TITLE;
  readonly doc = signal<DocView | null>(null);

  constructor() {
    const parsed = parseDocumentation(DOCUMENTATION_MARKDOWN);
    this.doc.set({
      toc: parsed.toc,
      html: this.sanitizer.bypassSecurityTrustHtml(parsed.html),
    });
    if (this.isBrowser) {
      setTimeout(() => this.scrollToHash());
    }
  }

  onArticleClick(event: Event): void {
    const anchor = (event.target as Element | null)?.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('#')) {
      return;
    }

    this.scrollTo(href.slice(1), event);
  }

  scrollTo(id: string, event?: Event): void {
    event?.preventDefault();

    const target = document.getElementById(id);
    const container = this.scrollContainer().nativeElement;
    if (!target || !container) {
      return;
    }

    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      96;

    container.scrollTo({ top, behavior: 'smooth' });
  }

  private scrollToHash(): void {
    const id = window.location.hash.slice(1);
    if (id) {
      this.scrollTo(id);
    }
  }
}