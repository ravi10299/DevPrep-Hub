import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TechnologyService } from '../../../core/services/technology.service';
import type { TechnologyDomain, Company } from '../../../core/models/technology.model';

@Component({
  selector: 'app-study-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './study-shell.component.html',
  styleUrl: './study-shell.component.css',
})
export class StudyShellComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  protected auth = inject(AuthService);
  private techService = inject(TechnologyService);

  sidebarOpen = signal(false);
  searchExpanded = signal(false);
  darkMode = signal(false);
  bookmarkedIds = signal<string[]>([]);
  domains = signal<TechnologyDomain[]>([]);
  companies = signal<Company[]>([]);

  // Filters - exposed to child content-list via shared state
  searchTerm = signal('');
  selectedTechnologyId = signal<string | null>(null);
  selectedDomainId = signal<string | null>(null);
  selectedCompanyIds = signal<string[]>([]);
  selectedDifficulty = signal<string | null>(null);

  bookmarkCount = computed(() => this.bookmarkedIds().length);
  hasActiveFilters = computed(() => {
    return (
      this.selectedTechnologyId() !== null ||
      this.selectedDomainId() !== null ||
      this.selectedCompanyIds().length > 0 ||
      this.selectedDifficulty() !== null ||
      this.searchTerm().trim() !== ''
    );
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('devprep-theme');
      if (savedTheme === 'dark') {
        this.darkMode.set(true);
        document.body.classList.add('dark-theme');
      }

      try {
        const saved = localStorage.getItem('devprep-bookmarks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) this.bookmarkedIds.set(parsed);
        }
      } catch { /* ignore */ }
    }

    this.loadMetadata();
  }

  private async loadMetadata(): Promise<void> {
    try {
      const [domains, companies] = await Promise.all([
        this.techService.getTechnologies(),
        this.techService.getCompanies(),
      ]);
      this.domains.set(domains);
      this.companies.set(companies);
    } catch { /* metadata loads on best-effort */ }
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  selectTechnology(id: string | null): void {
    this.selectedTechnologyId.set(id);
    this.closeSidebarOnMobile();
  }

  toggleCompany(id: string): void {
    const current = this.selectedCompanyIds();
    if (current.includes(id)) {
      this.selectedCompanyIds.set(current.filter(c => c !== id));
    } else {
      this.selectedCompanyIds.set([...current, id]);
    }
  }

  isCompanySelected(id: string): boolean {
    return this.selectedCompanyIds().includes(id);
  }

  selectDifficulty(d: string | null): void {
    this.selectedDifficulty.set(d);
  }

  clearFilters(): void {
    this.selectedTechnologyId.set(null);
    this.selectedDomainId.set(null);
    this.selectedCompanyIds.set([]);
    this.selectedDifficulty.set(null);
    this.searchTerm.set('');
  }

  toggleTheme(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    if (isPlatformBrowser(this.platformId)) {
      if (next) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('devprep-theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('devprep-theme', 'light');
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleSearch(): void {
    this.searchExpanded.update(v => !v);
  }

  closeSearch(): void {
    this.searchExpanded.set(false);
  }

  private closeSidebarOnMobile(): void {
    if (isPlatformBrowser(this.platformId) && window.innerWidth <= 900) {
      this.sidebarOpen.set(false);
    }
  }

  getTechIcon(icon: string): string {
    return icon || '';
  }

  getCompanyInitial(name: string): string {
    return name.charAt(0);
  }

  getCompanyClass(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  getDifficultyLabel(d: string | null): string {
    return d ?? 'All';
  }
}
