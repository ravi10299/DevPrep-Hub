export interface Technology {
  id: string;
  name: string;
  slug: string;
  icon: string;
  domain_id: string;
  sort_order: number;
  content_count: number;
}

export interface TechnologyDomain {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  technologies: Technology[];
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  content_count: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  content_count: number;
}
