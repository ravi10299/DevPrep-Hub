import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  Content,
  ContentFormData,
  PaginatedResponse,
  ContentFilters,
} from '../models/content.model';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);

  async getPublicContent(filters: ContentFilters = {}): Promise<PaginatedResponse<Content>> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.contentType) params = params.set('contentType', filters.contentType);
    if (filters.technologyId) params = params.set('technologyId', filters.technologyId);
    if (filters.domainId) params = params.set('domainId', filters.domainId);
    if (filters.companyId) params = params.set('companyId', filters.companyId);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters.tagId) params = params.set('tagId', filters.tagId);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));

    return firstValueFrom(
      this.http.get<PaginatedResponse<Content>>('/api/content', { params })
    );
  }

  async getContentById(id: string): Promise<Content> {
    const res = await firstValueFrom(
      this.http.get<{ data: Content }>(`/api/content/${id}`)
    );
    return res.data;
  }

  async getAdminContentById(id: string): Promise<Content> {
    const res = await firstValueFrom(
      this.http.get<{ data: Content }>(`/api/content/admin/${id}`)
    );
    return res.data;
  }

  // Admin endpoints
  async getAdminContent(filters: ContentFilters & { status?: string } = {}): Promise<PaginatedResponse<Content>> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.contentType) params = params.set('contentType', filters.contentType);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));

    return firstValueFrom(
      this.http.get<PaginatedResponse<Content>>('/api/content/admin/list', { params })
    );
  }

  async createAdminContent(data: ContentFormData): Promise<Content> {
    const res = await firstValueFrom(
      this.http.post<{ content: Content }>('/api/content/admin', data)
    );
    return res.content;
  }

  async updateAdminContent(id: string, data: ContentFormData): Promise<Content> {
    const res = await firstValueFrom(
      this.http.put<{ content: Content }>(`/api/content/admin/${id}`, data)
    );
    return res.content;
  }

  async deleteAdminContent(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`/api/content/admin/${id}`)
    );
  }

  async approveContent(id: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`/api/content/admin/${id}/approve`, {})
    );
  }

  async rejectContent(id: string, reviewNote: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`/api/content/admin/${id}/reject`, { reviewNote })
    );
  }

  async getContributorContentById(id: string): Promise<Content> {
    const res = await firstValueFrom(
      this.http.get<{ data: Content }>(`/api/content/contributor/${id}`)
    );
    return res.data;
  }

  // Contributor endpoints
  async getContributorContent(filters: ContentFilters & { status?: string } = {}): Promise<PaginatedResponse<Content>> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));

    return firstValueFrom(
      this.http.get<PaginatedResponse<Content>>('/api/content/contributor/list', { params })
    );
  }

  async createContributorContent(data: ContentFormData): Promise<Content> {
    const res = await firstValueFrom(
      this.http.post<{ content: Content }>('/api/content/contributor', data)
    );
    return res.content;
  }

  async updateContributorContent(id: string, data: ContentFormData): Promise<Content> {
    const res = await firstValueFrom(
      this.http.put<{ content: Content }>(`/api/content/contributor/${id}`, data)
    );
    return res.content;
  }

  async submitForReview(id: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`/api/content/contributor/${id}/submit`, {})
    );
  }
}
