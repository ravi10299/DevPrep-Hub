import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Content } from '../../../core/models/content.model';

@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.css',
})
export class ReviewDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private toast = inject(ToastService);

  content = signal<Content | null>(null);
  loading = signal(true);
  reviewNote = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadContent(id);
  }

  private async loadContent(id: string): Promise<void> {
    try {
      const content = await this.contentService.getAdminContentById(id);
      this.content.set(content);
    } catch {
      this.toast.error('Failed to load content.');
    } finally {
      this.loading.set(false);
    }
  }

  async approve(): Promise<void> {
    const id = this.content()?.id;
    if (!id) return;
    try {
      await this.contentService.approveContent(id);
      this.toast.success('Content approved.');
      this.router.navigate(['/admin/review']);
    } catch {
      this.toast.error('Failed to approve.');
    }
  }

  async reject(): Promise<void> {
    const id = this.content()?.id;
    if (!id) return;
    if (!this.reviewNote().trim()) {
      this.toast.error('Please provide a review note for rejection.');
      return;
    }
    try {
      await this.contentService.rejectContent(id, this.reviewNote());
      this.toast.success('Content rejected.');
      this.router.navigate(['/admin/review']);
    } catch {
      this.toast.error('Failed to reject.');
    }
  }
}
