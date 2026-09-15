import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Technologies (public + admin) ──

export function getTechnologies(_req: Request, res: Response): void {
  const db = getDb();

  const domains = db.prepare(`
    SELECT id, name, slug, sort_order FROM technology_domains ORDER BY sort_order, name
  `).all() as { id: string; name: string; slug: string; sort_order: number }[];

  const techs = db.prepare(`
    SELECT t.id, t.name, t.slug, t.icon, t.domain_id, t.sort_order,
      (SELECT COUNT(DISTINCT ct.content_id) FROM content_technologies ct
       JOIN content c ON ct.content_id = c.id
       WHERE ct.technology_id = t.id AND c.status = 'APPROVED') as content_count
    FROM technologies t
    ORDER BY t.sort_order, t.name
  `).all() as { id: string; name: string; slug: string; icon: string; domain_id: string; sort_order: number; content_count: number }[];

  const grouped = domains.map(domain => ({
    ...domain,
    technologies: techs.filter(t => t.domain_id === domain.id),
  }));

  res.json({ data: grouped });
}

export function createTechnology(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name, icon, domainId, sortOrder } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    db.prepare(`
      INSERT INTO technologies (id, name, slug, icon, domain_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, slug, icon || '', domainId, sortOrder || 0);
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

export function updateTechnology(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name, icon, domainId, sortOrder } = req.body;
  const slug = slugify(name);
  const result = db.prepare(`
    UPDATE technologies SET name = ?, slug = ?, icon = ?, domain_id = ?, sort_order = ?
    WHERE id = ?
  `).run(name, slug, icon || '', domainId, sortOrder || 0, req.params['id']);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
  res.json({ id: req.params['id'], name, slug });
}

export function deleteTechnology(req: AuthRequest, res: Response): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM technologies WHERE id = ?').run(req.params['id']);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Technology not found' });
    return;
  }
  res.json({ message: 'Technology deleted' });
}

// ── Technology Domains (admin) ──

export function createDomain(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name, sortOrder } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    db.prepare(`
      INSERT INTO technology_domains (id, name, slug, sort_order) VALUES (?, ?, ?, ?)
    `).run(id, name, slug, sortOrder || 0);
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Domain already exists' });
  }
}

export function updateDomain(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name, sortOrder } = req.body;
  const slug = slugify(name);
  const result = db.prepare(`
    UPDATE technology_domains SET name = ?, slug = ?, sort_order = ? WHERE id = ?
  `).run(name, slug, sortOrder || 0, req.params['id']);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }
  res.json({ id: req.params['id'], name, slug });
}

export function deleteDomain(req: AuthRequest, res: Response): void {
  const db = getDb();
  const techCount = (db.prepare(
    'SELECT COUNT(*) as count FROM technologies WHERE domain_id = ?'
  ).get(req.params['id']) as { count: number }).count;

  if (techCount > 0) {
    res.status(400).json({ error: 'Cannot delete domain with existing technologies' });
    return;
  }

  db.prepare('DELETE FROM technology_domains WHERE id = ?').run(req.params['id']);
  res.json({ message: 'Domain deleted' });
}

// ── Companies (public + admin) ──

export function getCompanies(_req: Request, res: Response): void {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id, c.name, c.slug,
      (SELECT COUNT(DISTINCT cc.content_id) FROM content_companies cc
       JOIN content co ON cc.content_id = co.id
       WHERE cc.company_id = c.id AND co.status = 'APPROVED') as content_count
    FROM companies c
    ORDER BY c.name
  `).all();
  res.json({ data: rows });
}

export function createCompany(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    db.prepare('INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Company already exists' });
  }
}

export function updateCompany(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name } = req.body;
  const slug = slugify(name);
  const result = db.prepare('UPDATE companies SET name = ?, slug = ? WHERE id = ?').run(name, slug, req.params['id']);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  res.json({ id: req.params['id'], name, slug });
}

export function deleteCompany(req: AuthRequest, res: Response): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM companies WHERE id = ?').run(req.params['id']);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  res.json({ message: 'Company deleted' });
}

// ── Tags (public + admin) ──

export function getTags(_req: Request, res: Response): void {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.id, t.name, t.slug,
      (SELECT COUNT(DISTINCT ct.content_id) FROM content_tags ct
       JOIN content c ON ct.content_id = c.id
       WHERE ct.tag_id = t.id AND c.status = 'APPROVED') as content_count
    FROM tags t
    ORDER BY t.name
  `).all();
  res.json({ data: rows });
}

export function createTag(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name } = req.body;
  const id = randomUUID();
  const slug = slugify(name);

  try {
    db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
    res.status(201).json({ id, name, slug });
  } catch {
    res.status(409).json({ error: 'Tag already exists' });
  }
}

export function updateTag(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { name } = req.body;
  const slug = slugify(name);
  const result = db.prepare('UPDATE tags SET name = ?, slug = ? WHERE id = ?').run(name, slug, req.params['id']);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  res.json({ id: req.params['id'], name, slug });
}

export function deleteTag(req: AuthRequest, res: Response): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params['id']);
  if (result.changes === 0) {
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
