import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Content } from '../../../core/models/content.model';
import { CONTENT_TYPE_LABELS } from '../../../core/models/content.model';

@Component({
  selector: 'app-content-manager',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './content-manager.component.html',
  styleUrl: './content-manager.component.css',
})
export class ContentManagerComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast = inject(ToastService);

  contents = signal<Content[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  statusFilter = signal('');
  protected typeLabels = CONTENT_TYPE_LABELS;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.contentService.getAdminContent({
        page: this.page(),
        limit: 20,
        status: this.statusFilter() || undefined,
      });
      this.contents.set(res.data);
      this.total.set(res.total);
    } catch {
      this.toast.error('Failed to load content.');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteContent(id: string): Promise<void> {
    if (!confirm('Delete this content permanently?')) return;
    try {
      await this.contentService.deleteAdminContent(id);
      this.toast.success('Content deleted.');
      this.load();
    } catch {
      this.toast.error('Failed to delete content.');
    }
  }

  filterByStatus(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  get totalPages(): number {
    return Math.ceil(this.total() / 20);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }
}
