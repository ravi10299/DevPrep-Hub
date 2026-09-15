import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';
import type { Content } from '../../../core/models/content.model';

@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './content-detail.component.html',
  styleUrl: './content-detail.component.css',
})
export class ContentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contentService = inject(ContentService);
  private platformId = inject(PLATFORM_ID);

  content = signal<Content | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  copied = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadContent(id);
  }

  private async loadContent(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const content = await this.contentService.getContentById(id);
      this.content.set(content);
    } catch {
      this.error.set('Content not found.');
    } finally {
      this.loading.set(false);
    }
  }

  parseBody(body: string): string[] {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return [body];
  }

  async copyCode(): Promise<void> {
    const code = this.content()?.codeSnippet;
    if (!code || !isPlatformBrowser(this.platformId)) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch { /* clipboard unavailable */ }
  }
}
