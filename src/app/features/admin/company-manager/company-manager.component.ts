import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TechnologyService } from '../../../core/services/technology.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Company } from '../../../core/models/technology.model';

@Component({
  selector: 'app-company-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './company-manager.component.html',
  styleUrl: './company-manager.component.css',
})
export class CompanyManagerComponent implements OnInit {
  private techService = inject(TechnologyService);
  private toast = inject(ToastService);

  companies = signal<Company[]>([]);
  loading = signal(false);
  newName = signal('');

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.companies.set(await this.techService.getCompanies());
    } catch {
      this.toast.error('Failed to load companies.');
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    try {
      await this.techService.createCompany({ name });
      this.newName.set('');
      this.toast.success('Company created.');
      this.load();
    } catch { this.toast.error('Failed to create company.'); }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this company?')) return;
    try {
      await this.techService.deleteCompany(id);
      this.toast.success('Company deleted.');
      this.load();
    } catch { this.toast.error('Failed to delete company.'); }
  }
}
