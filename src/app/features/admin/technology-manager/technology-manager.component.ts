import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TechnologyService } from '../../../core/services/technology.service';
import { ToastService } from '../../../core/services/toast.service';
import type { TechnologyDomain } from '../../../core/models/technology.model';

@Component({
  selector: 'app-technology-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './technology-manager.component.html',
  styleUrl: './technology-manager.component.css',
})
export class TechnologyManagerComponent implements OnInit {
  private techService = inject(TechnologyService);
  private toast = inject(ToastService);

  domains = signal<TechnologyDomain[]>([]);
  loading = signal(false);

  newDomainName = signal('');
  newTechName = signal('');
  newTechIcon = signal('');
  newTechDomainId = signal('');

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.domains.set(await this.techService.getTechnologies());
    } catch {
      this.toast.error('Failed to load technologies.');
    } finally {
      this.loading.set(false);
    }
  }

  async addDomain(): Promise<void> {
    const name = this.newDomainName().trim();
    if (!name) return;
    try {
      await this.techService.createDomain({ name });
      this.newDomainName.set('');
      this.toast.success('Domain created.');
      this.load();
    } catch { this.toast.error('Failed to create domain.'); }
  }

  async deleteDomain(id: string): Promise<void> {
    if (!confirm('Delete this domain?')) return;
    try {
      await this.techService.deleteDomain(id);
      this.toast.success('Domain deleted.');
      this.load();
    } catch { this.toast.error('Cannot delete domain with technologies.'); }
  }

  async addTechnology(): Promise<void> {
    const name = this.newTechName().trim();
    const domainId = this.newTechDomainId();
    if (!name || !domainId) return;
    try {
      await this.techService.createTechnology({
        name,
        icon: this.newTechIcon().trim(),
        domainId,
      });
      this.newTechName.set('');
      this.newTechIcon.set('');
      this.toast.success('Technology created.');
      this.load();
    } catch { this.toast.error('Failed to create technology.'); }
  }

  async deleteTechnology(id: string): Promise<void> {
    if (!confirm('Delete this technology?')) return;
    try {
      await this.techService.deleteTechnology(id);
      this.toast.success('Technology deleted.');
      this.load();
    } catch { this.toast.error('Failed to delete technology.'); }
  }
}
