import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { TechnologyDomain, Technology, Company, Tag } from '../models/technology.model';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const CACHE_TTL = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class TechnologyService {
  private http = inject(HttpClient);
  private cache = new Map<string, CacheEntry<unknown>>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { this.cache.delete(key); return null; }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  async getTechnologies(): Promise<TechnologyDomain[]> {
    const cached = this.getCached<TechnologyDomain[]>('technologies');
    if (cached) return cached;
    const res = await firstValueFrom(
      this.http.get<{ data: TechnologyDomain[] }>('/api/technologies')
    );
    this.setCache('technologies', res.data);
    return res.data;
  }

  async getCompanies(): Promise<Company[]> {
    const cached = this.getCached<Company[]>('companies');
    if (cached) return cached;
    const res = await firstValueFrom(
      this.http.get<{ data: Company[] }>('/api/companies')
    );
    this.setCache('companies', res.data);
    return res.data;
  }

  async getTags(): Promise<Tag[]> {
    const cached = this.getCached<Tag[]>('tags');
    if (cached) return cached;
    const res = await firstValueFrom(
      this.http.get<{ data: Tag[] }>('/api/tags')
    );
    this.setCache('tags', res.data);
    return res.data;
  }

  async getContentTypes(): Promise<{ value: string; label: string }[]> {
    const cached = this.getCached<{ value: string; label: string }[]>('contentTypes');
    if (cached) return cached;
    const res = await firstValueFrom(
      this.http.get<{ data: { value: string; label: string }[] }>('/api/content-types')
    );
    this.setCache('contentTypes', res.data);
    return res.data;
  }

  // Admin CRUD
  async createTechnology(data: { name: string; icon: string; domainId: string; sortOrder?: number }): Promise<Technology> {
    const res = await firstValueFrom(
      this.http.post<Technology>('/api/technologies', data)
    );
    this.clearCache();
    return res;
  }

  async updateTechnology(id: string, data: { name?: string; icon?: string; domainId?: string; sortOrder?: number }): Promise<Technology> {
    const res = await firstValueFrom(
      this.http.put<Technology>(`/api/technologies/${id}`, data)
    );
    this.clearCache();
    return res;
  }

  async deleteTechnology(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/technologies/${id}`));
    this.clearCache();
  }

  async createDomain(data: { name: string; sortOrder?: number }): Promise<TechnologyDomain> {
    const res = await firstValueFrom(
      this.http.post<TechnologyDomain>('/api/technology-domains', data)
    );
    this.clearCache();
    return res;
  }

  async updateDomain(id: string, data: { name?: string; sortOrder?: number }): Promise<TechnologyDomain> {
    const res = await firstValueFrom(
      this.http.put<TechnologyDomain>(`/api/technology-domains/${id}`, data)
    );
    this.clearCache();
    return res;
  }

  async deleteDomain(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/technology-domains/${id}`));
    this.clearCache();
  }

  async createCompany(data: { name: string }): Promise<Company> {
    const res = await firstValueFrom(
      this.http.post<Company>('/api/companies', data)
    );
    this.clearCache();
    return res;
  }

  async updateCompany(id: string, data: { name: string }): Promise<Company> {
    const res = await firstValueFrom(
      this.http.put<Company>(`/api/companies/${id}`, data)
    );
    this.clearCache();
    return res;
  }

  async deleteCompany(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/companies/${id}`));
    this.clearCache();
  }

  async createTag(data: { name: string }): Promise<Tag> {
    const res = await firstValueFrom(
      this.http.post<Tag>('/api/tags', data)
    );
    this.clearCache();
    return res;
  }

  async updateTag(id: string, data: { name: string }): Promise<Tag> {
    const res = await firstValueFrom(
      this.http.put<Tag>(`/api/tags/${id}`, data)
    );
    this.clearCache();
    return res;
  }

  async deleteTag(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/tags/${id}`));
    this.clearCache();
  }
}
