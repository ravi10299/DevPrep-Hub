import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { User, LoginRequest, LoginResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private accessToken = signal<string | null>(null);
  private currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly isContributor = computed(() => this.currentUser()?.role === 'CONTRIBUTOR');

  getAccessToken(): string | null {
    return this.accessToken();
  }

  async login(credentials: LoginRequest): Promise<User> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', credentials)
    );
    this.accessToken.set(response.accessToken);
    this.currentUser.set(response.user);
    return response.user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } catch {
      // Continue logout even if API call fails
    }
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  async tryRefresh(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<{ accessToken: string }>('/api/auth/refresh', {})
      );
      this.accessToken.set(response.accessToken);

      const meResponse = await firstValueFrom(
        this.http.get<{ user: User }>('/api/auth/me')
      );
      this.currentUser.set(meResponse.user);
      return true;
    } catch {
      this.accessToken.set(null);
      this.currentUser.set(null);
      return false;
    }
  }
}
