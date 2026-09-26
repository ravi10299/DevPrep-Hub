import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getClient } from '../db/database.js';
import { getCached, setCache, invalidateCache } from '../cache.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const TECH_ICON_MAP: Record<string, string> = {
  'angular': 'devicon-angular-plain',
  'react': 'devicon-react-original',
  'vue': 'devicon-vuejs-plain',
  'vue.js': 'devicon-vuejs-plain',
  'vuejs': 'devicon-vuejs-plain',
  'next.js': 'devicon-nextjs-plain',
  'nextjs': 'devicon-nextjs-plain',
  'nuxt': 'devicon-nuxtjs-plain',
  'svelte': 'devicon-svelte-plain',
  'java': 'devicon-java-plain',
  'java core': 'devicon-java-plain',
  'spring': 'devicon-spring-plain',
  'spring boot': 'devicon-spring-plain',
  'javascript': 'devicon-javascript-plain',
  'typescript': 'devicon-typescript-plain',
  'python': 'devicon-python-plain',
  'c': 'devicon-c-plain',
  'c++': 'devicon-cplusplus-plain',
  'c#': 'devicon-csharp-plain',
  'csharp': 'devicon-csharp-plain',
  'go': 'devicon-go-original-wordmark',
  'golang': 'devicon-go-original-wordmark',
  'rust': 'devicon-rust-original',
  'ruby': 'devicon-ruby-plain',
  'php': 'devicon-php-plain',
  'swift': 'devicon-swift-plain',
  'kotlin': 'devicon-kotlin-plain',
  'dart': 'devicon-dart-plain',
  'flutter': 'devicon-flutter-plain',
  'node.js': 'devicon-nodejs-plain',
  'nodejs': 'devicon-nodejs-plain',
  'node': 'devicon-nodejs-plain',
  'express': 'devicon-express-original',
  'express.js': 'devicon-express-original',
  'django': 'devicon-django-plain',
  'flask': 'devicon-flask-original',
  'rails': 'devicon-rails-plain',
  'ruby on rails': 'devicon-rails-plain',
  '.net': 'devicon-dotnetcore-plain',
  'dotnet': 'devicon-dotnetcore-plain',
  'mysql': 'devicon-mysql-original',
  'postgresql': 'devicon-postgresql-plain',
  'postgres': 'devicon-postgresql-plain',
  'mongodb': 'devicon-mongodb-plain',
  'redis': 'devicon-redis-plain',
  'sqlite': 'devicon-sqlite-plain',
  'oracle': 'devicon-oracle-original',
  'firebase': 'devicon-firebase-plain',
  'docker': 'devicon-docker-plain',
  'kubernetes': 'devicon-kubernetes-plain',
  'aws': 'devicon-amazonwebservices-original',
  'azure': 'devicon-azure-plain',
  'gcp': 'devicon-googlecloud-plain',
  'google cloud': 'devicon-googlecloud-plain',
  'git': 'devicon-git-plain',
  'github': 'devicon-github-original',
  'linux': 'devicon-linux-plain',
  'html': 'devicon-html5-plain',
  'html5': 'devicon-html5-plain',
  'css': 'devicon-css3-plain',
  'css3': 'devicon-css3-plain',
  'sass': 'devicon-sass-original',
  'tailwind': 'devicon-tailwindcss-plain',
  'tailwind css': 'devicon-tailwindcss-plain',
  'bootstrap': 'devicon-bootstrap-plain',
  'webpack': 'devicon-webpack-plain',
  'graphql': 'devicon-graphql-plain',
  'scala': 'devicon-scala-plain',
  'r': 'devicon-r-plain',
  'matlab': 'devicon-matlab-plain',
  'terraform': 'devicon-terraform-plain',
  'nginx': 'devicon-nginx-original',
  'apache': 'devicon-apache-plain',
  'jenkins': 'devicon-jenkins-plain',
  'react native': 'devicon-react-original',
  'electron': 'devicon-electron-original',
  'figma': 'devicon-figma-plain',
  'unity': 'devicon-unity-original',
  'android': 'devicon-android-plain',
  'ios': 'devicon-apple-original',
  'data structures': 'devicon-thealgorithms-plain',
  'dsa': 'devicon-thealgorithms-plain',
  'algorithms': 'devicon-thealgorithms-plain',
  'ai': 'devicon-tensorflow-original',
  'artificial intelligence': 'devicon-tensorflow-original',
  'ml': 'devicon-pytorch-original',
  'machine learning': 'devicon-pytorch-original',
  'tensorflow': 'devicon-tensorflow-original',
  'pytorch': 'devicon-pytorch-original',
  'jupyter': 'devicon-jupyter-plain',
  'numpy': 'devicon-numpy-original',
  'pandas': 'devicon-pandas-original',
  'opencv': 'devicon-opencv-plain',
  'anaconda': 'devicon-anaconda-original',
  'kaggle': 'devicon-kaggle-original',
  'scikit-learn': 'devicon-scikitlearn-plain',
  'keras': 'devicon-keras-plain',
};

function resolveIcon(name: string, explicitIcon?: string): string {
  if (explicitIcon?.trim()) return explicitIcon.trim();
  return TECH_ICON_MAP[name.toLowerCase()] || '';
}

// ── Technologies (public + admin) ──

export async function getTechnologies(_req: Request, res: Response): Promise<void> {
  const cached = getCached<{ data: unknown }>('meta:technologies');
  if (cached) {
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json(cached);
    return;
  }

  const db = getClient();

  const [domainResult, techResult] = await Promise.all([
    db.execute('SELECT id, name, slug, sort_order FROM technology_domains ORDER BY sort_order, name'),
    db.execute(`
      SELECT t.id, t.name, t.slug, t.icon, t.domain_id, t.sort_order,
        (SELECT COUNT(DISTINCT ct.content_id) FROM content_technologies ct
         JOIN content c ON ct.content_id = c.id
         WHERE ct.technology_id = t.id AND c.status = 'APPROVED') as content_count
      FROM technologies t
      ORDER BY t.sort_order, t.name
    `),
  ]);

  const domains = domainResult.rows as unknown as { id: string; name: string; slug: string; sort_order: number }[];
  const techs = techResult.rows as unknown as { id: string; name: string; slug: string; icon: string; domain_id: string; sort_order: number; content_count: number }[];

  const grouped = domains.map(domain => ({
    ...domain,
    technologies: techs.filter(t => t.domain_id === domain.id),
  }));

  const payload = { data: grouped };
  setCache('meta:technologies', payload, 300_000);
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.json(payload);
}

export async function createTechnology(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name, icon, domainId, sortOrder } = req.body;
  const id = randomUUID();
  const slug = slugify(name);
  const resolvedIcon = resolveIcon(name, icon);

  try {
    await db.execute({
      sql: 'INSERT INTO technologies (id, name, slug, icon, domain_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, slug, resolvedIcon, domainId, sortOrder || 0],
    });
    invalidateCache('meta:');
    res.status(201).json({ id, name, slug });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Technology already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create technology' });
    }
  }
}

export async function updateTechnology(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name, icon, domainId, sortOrder } = req.body;
  const slug = slugify(name);
  const resolvedIcon = resolveIcon(name, icon);
  const result = await db.execute({
    sql: 'UPDATE technologies SET name = ?, slug = ?, icon = ?, domain_id = ?, sort_order = ? WHERE id = ?',
    args: [name, slug, resolvedIcon, domainId, sortOrder || 0, req.params['id'] as string],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteTechnology(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM technologies WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ message: 'Technology deleted' });
}

// ── Technology Domains (admin) ──

export async function createDomain(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name, sortOrder } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({
      sql: 'INSERT INTO technology_domains (id, name, slug, sort_order) VALUES (?, ?, ?, ?)',
      args: [id, name, slug, sortOrder || 0],
    });
    invalidateCache('meta:');
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Domain already exists' });
  }
}

export async function updateDomain(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name, sortOrder } = req.body;
  const slug = slugify(name);
  const result = await db.execute({
    sql: 'UPDATE technology_domains SET name = ?, slug = ?, sort_order = ? WHERE id = ?',
    args: [name, slug, sortOrder || 0, req.params['id'] as string],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteDomain(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM technologies WHERE domain_id = ?',
    args: [req.params['id'] as string],
  });

  if (Number(countResult.rows[0]?.['count'] ?? 0) > 0) {
    res.status(400).json({ error: 'Cannot delete domain with existing technologies' });
    return;
  }

  await db.execute({ sql: 'DELETE FROM technology_domains WHERE id = ?', args: [req.params['id'] as string] });
  invalidateCache('meta:');
  res.json({ message: 'Domain deleted' });
}

// ── Companies (public + admin) ──

export async function getCompanies(_req: Request, res: Response): Promise<void> {
  const cached = getCached<{ data: unknown }>('meta:companies');
  if (cached) {
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json(cached);
    return;
  }

  const db = getClient();
  const result = await db.execute(`
    SELECT c.id, c.name, c.slug,
      (SELECT COUNT(DISTINCT cc.content_id) FROM content_companies cc
       JOIN content co ON cc.content_id = co.id
       WHERE cc.company_id = c.id AND co.status = 'APPROVED') as content_count
    FROM companies c
    ORDER BY c.name
  `);
  const payload = { data: result.rows };
  setCache('meta:companies', payload, 300_000);
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.json(payload);
}

export async function createCompany(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({ sql: 'INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)', args: [id, name, slug] });
    invalidateCache('meta:');
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Company already exists' });
  }
}

export async function updateCompany(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const slug = slugify(name);
  const result = await db.execute({
    sql: 'UPDATE companies SET name = ?, slug = ? WHERE id = ?',
    args: [name, slug, req.params['id'] as string],
  });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteCompany(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM companies WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ message: 'Company deleted' });
}

// ── Tags (public + admin) ──

export async function getTags(_req: Request, res: Response): Promise<void> {
  const cached = getCached<{ data: unknown }>('meta:tags');
  if (cached) {
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json(cached);
    return;
  }

  const db = getClient();
  const result = await db.execute(`
    SELECT t.id, t.name, t.slug,
      (SELECT COUNT(DISTINCT ct.content_id) FROM content_tags ct
       JOIN content c ON ct.content_id = c.id
       WHERE ct.tag_id = t.id AND c.status = 'APPROVED') as content_count
    FROM tags t
    ORDER BY t.name
  `);
  const payload = { data: result.rows };
  setCache('meta:tags', payload, 300_000);
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.json(payload);
}

export async function createTag(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({ sql: 'INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)', args: [id, name, slug] });
    invalidateCache('meta:');
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Tag already exists' });
  }
}

export async function updateTag(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const slug = slugify(name);
  const result = await db.execute({
    sql: 'UPDATE tags SET name = ?, slug = ? WHERE id = ?',
    args: [name, slug, req.params['id'] as string],
  });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteTag(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  invalidateCache('meta:');
  res.json({ message: 'Tag deleted' });
}

// ── Content Types (public) ──

export function getContentTypes(_req: Request, res: Response): void {
  res.json({
    data: [
      { value: 'QUESTION', label: 'Interview Question' },
      { value: 'CONCEPT', label: 'Concept' },
      { value: 'NOTE', label: 'Note' },
      { value: 'CODE_EXAMPLE', label: 'Code Example' },
      { value: 'CHEAT_SHEET', label: 'Cheat Sheet' },
      { value: 'INTERVIEW_EXPERIENCE', label: 'Interview Experience' },
      { value: 'PREPARATION_GUIDE', label: 'Preparation Guide' },
      { value: 'SYSTEM_DESIGN', label: 'System Design' },
      { value: 'DSA', label: 'DSA' },
    ],
  });
}
