export type ContentType =
  | 'QUESTION'
  | 'CONCEPT'
  | 'NOTE'
  | 'CODE_EXAMPLE'
  | 'CHEAT_SHEET'
  | 'INTERVIEW_EXPERIENCE'
  | 'PREPARATION_GUIDE'
  | 'SYSTEM_DESIGN'
  | 'DSA';

export type ContentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TechnologyRef {
  id: string;
  name: string;
  slug: string;
  icon: string;
  domain_name: string;
  domain_slug: string;
}

export interface CompanyRef {
  id: string;
  name: string;
  slug: string;
}

export interface TagRef {
  id: string;
  name: string;
  slug: string;
}

export interface Content {
  id: string;
  title: string;
  body: string;
  contentType: ContentType;
  difficulty: Difficulty | null;
  codeSnippet: string | null;
  codeLanguage: string | null;
  status: ContentStatus;
  reviewNote: string | null;
  authorId: string;
  authorName: string;
  technologies: TechnologyRef[];
  companies: CompanyRef[];
  tags: TagRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentFormData {
  title: string;
  body: string;
  contentType: ContentType;
  difficulty?: Difficulty | null;
  codeSnippet?: string | null;
  codeLanguage?: string | null;
  technologyIds?: string[];
  companyIds?: string[];
  tagIds?: string[];
  status?: ContentStatus;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ContentFilters {
  search?: string;
  contentType?: ContentType;
  technologyId?: string;
  domainId?: string;
  companyId?: string;
  difficulty?: Difficulty;
  tagId?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  QUESTION: 'Interview Question',
  CONCEPT: 'Concept',
  NOTE: 'Note',
  CODE_EXAMPLE: 'Code Example',
  CHEAT_SHEET: 'Cheat Sheet',
  INTERVIEW_EXPERIENCE: 'Interview Experience',
  PREPARATION_GUIDE: 'Preparation Guide',
  SYSTEM_DESIGN: 'System Design',
  DSA: 'DSA',
};
