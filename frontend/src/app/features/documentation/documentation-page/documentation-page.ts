import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
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
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly scrollContainer = viewChild.required<ElementRef<HTMLElement>>('scrollContainer');

  readonly docPageTitle = DOC_PAGE_TITLE;
  readonly doc = signal<DocView | null>(null);

  constructor() {
    this.http.get('/documentation.md', { responseType: 'text' }).subscribe((source) => {
      const parsed = parseDocumentation(source);
      this.doc.set({
        toc: parsed.toc,
        html: this.sanitizer.bypassSecurityTrustHtml(parsed.html),
      });
      setTimeout(() => this.scrollToHash());
    });
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