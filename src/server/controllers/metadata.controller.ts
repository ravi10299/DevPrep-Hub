import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getClient } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Technologies (public + admin) ──

export async function getTechnologies(_req: Request, res: Response): Promise<void> {
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

  res.json({ data: grouped });
}

export async function createTechnology(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name, icon, domainId, sortOrder } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({
      sql: 'INSERT INTO technologies (id, name, slug, icon, domain_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, slug, icon || '', domainId, sortOrder || 0],
    });
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
  const result = await db.execute({
    sql: 'UPDATE technologies SET name = ?, slug = ?, icon = ?, domain_id = ?, sort_order = ? WHERE id = ?',
    args: [name, slug, icon || '', domainId, sortOrder || 0, req.params['id'] as string],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteTechnology(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM technologies WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
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
  res.json({ message: 'Domain deleted' });
}

// ── Companies (public + admin) ──

export async function getCompanies(_req: Request, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute(`
    SELECT c.id, c.name, c.slug,
      (SELECT COUNT(DISTINCT cc.content_id) FROM content_companies cc
       JOIN content co ON cc.content_id = co.id
       WHERE cc.company_id = c.id AND co.status = 'APPROVED') as content_count
    FROM companies c
    ORDER BY c.name
  `);
  res.json({ data: result.rows });
}

export async function createCompany(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({ sql: 'INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)', args: [id, name, slug] });
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
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteCompany(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM companies WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  res.json({ message: 'Company deleted' });
}

// ── Tags (public + admin) ──

export async function getTags(_req: Request, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute(`
    SELECT t.id, t.name, t.slug,
      (SELECT COUNT(DISTINCT ct.content_id) FROM content_tags ct
       JOIN content c ON ct.content_id = c.id
       WHERE ct.tag_id = t.id AND c.status = 'APPROVED') as content_count
    FROM tags t
    ORDER BY t.name
  `);
  res.json({ data: result.rows });
}

export async function createTag(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    await db.execute({ sql: 'INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)', args: [id, name, slug] });
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
  res.json({ id: req.params['id'], name, slug });
}

export async function deleteTag(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
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
