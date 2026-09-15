import { Component, OnInit, signal, computed, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';
import { StudyShellComponent } from '../study-shell/study-shell.component';
import type { Content, ContentFilters } from '../../../core/models/content.model';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [],
  templateUrl: './content-list.component.html',
  styleUrl: './content-list.component.css',
})
export class ContentListComponent implements OnInit {
  private contentService = inject(ContentService);
  private platformId = inject(PLATFORM_ID);
  protected shell = inject(StudyShellComponent);

  contents = signal<Content[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  loading = signal(false);
  expandedId = signal<string | null>(null);
  copiedId = signal<string | null>(null);

  filteredCount = computed(() => this.totalCount());

  constructor() {
    effect(() => {
      this.shell.searchTerm();
      this.shell.selectedTechnologyId();
      this.shell.selectedCompanyIds();
      this.shell.selectedDifficulty();
      this.currentPage.set(1);
      this.loadContent();
    });
  }

  ngOnInit(): void {
    this.loadContent();
  }

  private async loadContent(): Promise<void> {
    this.loading.set(true);
    try {
      const filters: ContentFilters = {
        page: this.currentPage(),
        limit: 20,
      };

      const search = this.shell.searchTerm().trim();
      if (search) filters.search = search;

      const techId = this.shell.selectedTechnologyId();
      if (techId) filters.technologyId = techId;

      const companyIds = this.shell.selectedCompanyIds();
      if (companyIds.length === 1) filters.companyId = companyIds[0];

      const diff = this.shell.selectedDifficulty();
      if (diff) filters.difficulty = diff as ContentFilters['difficulty'];

      const response = await this.contentService.getPublicContent(filters);
      this.contents.set(response.data);
      this.totalCount.set(response.total);
    } catch {
      this.contents.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  toggleExpanded(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  async copyCode(content: Content): Promise<void> {
    if (!content.codeSnippet || !isPlatformBrowser(this.platformId)) return;
    try {
      await navigator.clipboard.writeText(content.codeSnippet);
      this.copiedId.set(content.id);
      setTimeout(() => {
        if (this.copiedId() === content.id) this.copiedId.set(null);
      }, 1800);
    } catch { /* clipboard not available */ }
  }

  toggleBookmark(id: string): void {
    const current = this.shell.bookmarkedIds();
    const updated = current.includes(id)
      ? current.filter(b => b !== id)
      : [...current, id];
    this.shell.bookmarkedIds.set(updated);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('devprep-bookmarks', JSON.stringify(updated));
    }
  }

  isBookmarked(id: string): boolean {
    return this.shell.bookmarkedIds().includes(id);
  }

  getTechIcon(content: Content): string {
    return content.technologies?.[0]?.icon || '';
  }

  getTechName(content: Content): string {
    return content.technologies?.[0]?.name || '';
  }

  getTechClass(content: Content): string {
    const name = this.getTechName(content);
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  getCompanyName(content: Content): string {
    return content.companies?.[0]?.name || '';
  }

  getCompanyClass(content: Content): string {
    return this.getCompanyName(content).toLowerCase().replace(/\s+/g, '-');
  }

  getCompanyInitial(content: Content): string {
    return this.getCompanyName(content).charAt(0);
  }

  parseBody(body: string): string[] {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return [body];
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadContent();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / 20);
  }

  getTechFilterName(): string {
    for (const domain of this.shell.domains()) {
      const tech = domain.technologies.find(t => t.id === this.shell.selectedTechnologyId());
      if (tech) return tech.name;
    }
    return '';
  }

  getCompanyFilterName(id: string): string {
    return this.shell.companies().find(c => c.id === id)?.name || '';
  }

  getPaginationRange(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
