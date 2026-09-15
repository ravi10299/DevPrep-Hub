import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TechnologyService } from '../../../core/services/technology.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Tag } from '../../../core/models/technology.model';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tag-manager.component.html',
  styleUrl: './tag-manager.component.css',
})
export class TagManagerComponent implements OnInit {
  private techService = inject(TechnologyService);
  private toast = inject(ToastService);

  tags = signal<Tag[]>([]);
  loading = signal(false);
  newName = signal('');

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.tags.set(await this.techService.getTags());
    } catch {
      this.toast.error('Failed to load tags.');
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    try {
      await this.techService.createTag({ name });
      this.newName.set('');
      this.toast.success('Tag created.');
      this.load();
    } catch { this.toast.error('Failed to create tag.'); }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this tag?')) return;
    try {
      await this.techService.deleteTag(id);
      this.toast.success('Tag deleted.');
      this.load();
    } catch { this.toast.error('Failed to delete tag.'); }
  }
}
