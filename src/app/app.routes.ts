import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { contributorGuard } from './core/guards/contributor.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/study/study-shell/study-shell.component').then(m => m.StudyShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/study/content-list/content-list.component').then(m => m.ContentListComponent) },
      { path: 'content/:id', loadComponent: () => import('./features/study/content-detail/content-detail.component').then(m => m.ContentDetailComponent) },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'content', pathMatch: 'full' },
      { path: 'content', loadComponent: () => import('./features/admin/content-manager/content-manager.component').then(m => m.ContentManagerComponent) },
      { path: 'content/new', loadComponent: () => import('./features/admin/content-form/content-form.component').then(m => m.ContentFormComponent) },
      { path: 'content/edit/:id', loadComponent: () => import('./features/admin/content-form/content-form.component').then(m => m.ContentFormComponent) },
      { path: 'review', loadComponent: () => import('./features/admin/review-queue/review-queue.component').then(m => m.ReviewQueueComponent) },
      { path: 'review/:id', loadComponent: () => import('./features/admin/review-detail/review-detail.component').then(m => m.ReviewDetailComponent) },
      { path: 'technologies', loadComponent: () => import('./features/admin/technology-manager/technology-manager.component').then(m => m.TechnologyManagerComponent) },
      { path: 'companies', loadComponent: () => import('./features/admin/company-manager/company-manager.component').then(m => m.CompanyManagerComponent) },
      { path: 'tags', loadComponent: () => import('./features/admin/tag-manager/tag-manager.component').then(m => m.TagManagerComponent) },
    ],
  },
  {
    path: 'contributor',
    canActivate: [contributorGuard],
    loadComponent: () => import('./features/contributor/contributor-shell/contributor-shell.component').then(m => m.ContributorShellComponent),
    children: [
      { path: '', redirectTo: 'content', pathMatch: 'full' },
      { path: 'content', loadComponent: () => import('./features/contributor/my-content/my-content.component').then(m => m.MyContentComponent) },
      { path: 'content/new', loadComponent: () => import('./features/contributor/content-form/content-form.component').then(m => m.ContributorContentFormComponent) },
      { path: 'content/edit/:id', loadComponent: () => import('./features/contributor/content-form/content-form.component').then(m => m.ContributorContentFormComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
