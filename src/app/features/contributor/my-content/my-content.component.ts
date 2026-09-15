import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Content } from '../../../core/models/content.model';
import { CONTENT_TYPE_LABELS } from '../../../core/models/content.model';

@Component({
  selector: 'app-my-content',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-content.component.html',
  styleUrl: './my-content.component.css',
})
export class MyContentComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast = inject(ToastService);

  contents = signal<Content[]>([]);
  loading = signal(false);
  statusFilter = signal('');
  protected typeLabels = CONTENT_TYPE_LABELS;

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.contentService.getContributorContent({
        status: this.statusFilter() || undefined,
        limit: 50,
      });
      this.contents.set(res.data);
    } catch {
      this.toast.error('Failed to load your content.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitForReview(id: string): Promise<void> {
    try {
      await this.contentService.submitForReview(id);
      this.toast.success('Submitted for review.');
      this.load();
    } catch {
      this.toast.error('Failed to submit for review.');
    }
  }

  filterByStatus(status: string): void {
    this.statusFilter.set(status);
    this.load();
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }
}
