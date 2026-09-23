import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { TechnologyDomain, Technology, Company, Tag } from '../models/technology.model';

@Injectable({ providedIn: 'root' })
export class TechnologyService {
  private http = inject(HttpClient);

  async getTechnologies(): Promise<TechnologyDomain[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: TechnologyDomain[] }>('/api/technologies')
    );
    return res.data;
  }

  async getCompanies(): Promise<Company[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: Company[] }>('/api/companies')
    );
    return res.data;
  }

  async getTags(): Promise<Tag[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: Tag[] }>('/api/tags')
    );
    return res.data;
  }

  async getContentTypes(): Promise<{ value: string; label: string }[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: { value: string; label: string }[] }>('/api/content-types')
    );
    return res.data;
  }

  // Admin CRUD
  async createTechnology(data: { name: string; icon: string; domainId: string; sortOrder?: number }): Promise<Technology> {
    const res = await firstValueFrom(
      this.http.post<Technology>('/api/technologies', data)
    );
    return res;
  }

  async updateTechnology(id: string, data: { name?: string; icon?: string; domainId?: string; sortOrder?: number }): Promise<Technology> {
    const res = await firstValueFrom(
      this.http.put<Technology>(`/api/technologies/${id}`, data)
    );
    return res;
  }

  async deleteTechnology(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/technologies/${id}`));
  }

  async createDomain(data: { name: string; sortOrder?: number }): Promise<TechnologyDomain> {
    const res = await firstValueFrom(
      this.http.post<TechnologyDomain>('/api/technology-domains', data)
    );
    return res;
  }

  async updateDomain(id: string, data: { name?: string; sortOrder?: number }): Promise<TechnologyDomain> {
    const res = await firstValueFrom(
      this.http.put<TechnologyDomain>(`/api/technology-domains/${id}`, data)
    );
    return res;
  }

  async deleteDomain(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/technology-domains/${id}`));
  }

  async createCompany(data: { name: string }): Promise<Company> {
    const res = await firstValueFrom(
      this.http.post<Company>('/api/companies', data)
    );
    return res;
  }

  async updateCompany(id: string, data: { name: string }): Promise<Company> {
    const res = await firstValueFrom(
      this.http.put<Company>(`/api/companies/${id}`, data)
    );
    return res;
  }

  async deleteCompany(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/companies/${id}`));
  }

  async createTag(data: { name: string }): Promise<Tag> {
    const res = await firstValueFrom(
      this.http.post<Tag>('/api/tags', data)
    );
    return res;
  }

  async updateTag(id: string, data: { name: string }): Promise<Tag> {
    const res = await firstValueFrom(
      this.http.put<Tag>(`/api/tags/${id}`, data)
    );
    return res;
  }

  async deleteTag(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/tags/${id}`));
  }
}
