import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Content } from '../../../core/models/content.model';
import { CONTENT_TYPE_LABELS } from '../../../core/models/content.model';

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './review-queue.component.html',
  styleUrl: './review-queue.component.css',
})
export class ReviewQueueComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast = inject(ToastService);

  contents = signal<Content[]>([]);
  loading = signal(false);
  protected typeLabels = CONTENT_TYPE_LABELS;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.contentService.getAdminContent({
        status: 'PENDING_REVIEW',
        limit: 50,
      });
      this.contents.set(res.data);
    } catch {
      this.toast.error('Failed to load review queue.');
    } finally {
      this.loading.set(false);
    }
  }

  async approve(id: string): Promise<void> {
    try {
      await this.contentService.approveContent(id);
      this.toast.success('Content approved.');
      this.load();
    } catch {
      this.toast.error('Failed to approve.');
    }
  }
}
