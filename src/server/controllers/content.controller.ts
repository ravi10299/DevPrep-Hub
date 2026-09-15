import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

interface ContentRow {
  id: string;
  title: string;
  body: string;
  content_type: string;
  difficulty: string | null;
  code_snippet: string | null;
  code_language: string | null;
  status: string;
  review_note: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

function attachRelations(db: ReturnType<typeof getDb>, contentId: string) {
  const technologies = db.prepare(`
    SELECT t.id, t.name, t.slug, t.icon, td.name as domain_name, td.slug as domain_slug
    FROM content_technologies ct
    JOIN technologies t ON ct.technology_id = t.id
    JOIN technology_domains td ON t.domain_id = td.id
    WHERE ct.content_id = ?
  `).all(contentId) as { id: string; name: string; slug: string; icon: string; domain_name: string; domain_slug: string }[];

  const companies = db.prepare(`
    SELECT c.id, c.name, c.slug
    FROM content_companies cc
    JOIN companies c ON cc.company_id = c.id
    WHERE cc.content_id = ?
  `).all(contentId) as { id: string; name: string; slug: string }[];

  const tags = db.prepare(`
    SELECT t.id, t.name, t.slug
    FROM content_tags ct
    JOIN tags t ON ct.tag_id = t.id
    WHERE ct.content_id = ?
  `).all(contentId) as { id: string; name: string; slug: string }[];

  return { technologies, companies, tags };
}

function formatContent(row: ContentRow, relations: ReturnType<typeof attachRelations>) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    contentType: row.content_type,
    difficulty: row.difficulty,
    codeSnippet: row.code_snippet,
    codeLanguage: row.code_language,
    status: row.status,
    reviewNote: row.review_note,
    authorId: row.author_id,
    authorName: row.author_name,
    technologies: relations.technologies,
    companies: relations.companies,
    tags: relations.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Public: get approved content with filters
export function getPublicContent(req: Request, res: Response): void {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["c.status = 'APPROVED'"];
  const params: unknown[] = [];

  if (req.query['search']) {
    const search = `%${req.query['search']}%`;
    conditions.push(`(
      c.title LIKE ? OR c.body LIKE ?
      OR EXISTS (SELECT 1 FROM content_technologies ct2 JOIN technologies t2 ON ct2.technology_id = t2.id WHERE ct2.content_id = c.id AND t2.name LIKE ?)
      OR EXISTS (SELECT 1 FROM content_companies cc2 JOIN companies co2 ON cc2.company_id = co2.id WHERE cc2.content_id = c.id AND co2.name LIKE ?)
      OR EXISTS (SELECT 1 FROM content_tags ct3 JOIN tags tg ON ct3.tag_id = tg.id WHERE ct3.content_id = c.id AND tg.name LIKE ?)
    )`);
    params.push(search, search, search, search, search);
  }

  if (req.query['contentType']) {
    conditions.push('c.content_type = ?');
    params.push(req.query['contentType']);
  }

  if (req.query['difficulty']) {
    conditions.push('c.difficulty = ?');
    params.push(req.query['difficulty']);
  }

  if (req.query['technologyId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_technologies ct4 WHERE ct4.content_id = c.id AND ct4.technology_id = ?)');
    params.push(req.query['technologyId']);
  }

  if (req.query['domainId']) {
    conditions.push(`EXISTS (
      SELECT 1 FROM content_technologies ct5
      JOIN technologies t5 ON ct5.technology_id = t5.id
      WHERE ct5.content_id = c.id AND t5.domain_id = ?
    )`);
    params.push(req.query['domainId']);
  }

  if (req.query['companyId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_companies cc3 WHERE cc3.content_id = c.id AND cc3.company_id = ?)');
    params.push(req.query['companyId']);
  }

  if (req.query['tagId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_tags ct6 WHERE ct6.content_id = c.id AND ct6.tag_id = ?)');
    params.push(req.query['tagId']);
  }

  const where = conditions.join(' AND ');

  const sort = req.query['sort'] === 'oldest' ? 'ASC' : 'DESC';

  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM content c WHERE ${where}
  `).get(...params) as { count: number }).count;

  const rows = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE ${where}
    ORDER BY c.created_at ${sort}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ContentRow[];

  const data = rows.map(row => {
    const relations = attachRelations(db, row.id);
    return formatContent(row, relations);
  });

  res.json({ data, total, page, limit });
}

export function getPublicContentById(req: Request, res: Response): void {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = ? AND c.status = 'APPROVED'
  `).get(req.params['id']) as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = attachRelations(db, row.id);
  res.json({ data: formatContent(row, relations) });
}

// Admin: get any content by ID (regardless of status)
export function getAdminContentById(req: AuthRequest, res: Response): void {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `).get(req.params['id']) as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = attachRelations(db, row.id);
  res.json({ data: formatContent(row, relations) });
}

// Admin: get all content
export function getAdminContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  if (req.query['status']) {
    conditions.push('c.status = ?');
    params.push(req.query['status']);
  }

  if (req.query['contentType']) {
    conditions.push('c.content_type = ?');
    params.push(req.query['contentType']);
  }

  if (req.query['search']) {
    const search = `%${req.query['search']}%`;
    conditions.push('(c.title LIKE ? OR c.body LIKE ?)');
    params.push(search, search);
  }

  const where = conditions.join(' AND ');

  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM content c WHERE ${where}
  `).get(...params) as { count: number }).count;

  const rows = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE ${where}
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ContentRow[];

  const data = rows.map(row => {
    const relations = attachRelations(db, row.id);
    return formatContent(row, relations);
  });

  res.json({ data, total, page, limit });
}

// Admin: create content (can publish directly)
export function createAdminContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const id = randomUUID();
  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds, status,
  } = req.body;

  const finalStatus = status || 'APPROVED';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO content (id, title, body, content_type, difficulty, code_snippet, code_language, status, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, finalStatus, req.user!.userId, now, now);

  if (technologyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)');
    for (const tid of technologyIds) stmt.run(id, tid);
  }

  if (companyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)');
    for (const cid of companyIds) stmt.run(id, cid);
  }

  if (tagIds?.length) {
    const stmt = db.prepare('INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)');
    for (const tid of tagIds) stmt.run(id, tid);
  }

  res.status(201).json({ id, status: finalStatus });
}

// Admin: update content
export function updateAdminContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const contentId = req.params['id'];

  const existing = db.prepare('SELECT id FROM content WHERE id = ?').get(contentId);
  if (!existing) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds, status,
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE content SET title = ?, body = ?, content_type = ?, difficulty = ?,
    code_snippet = ?, code_language = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, status || 'APPROVED', now, contentId);

  db.prepare('DELETE FROM content_technologies WHERE content_id = ?').run(contentId);
  db.prepare('DELETE FROM content_companies WHERE content_id = ?').run(contentId);
  db.prepare('DELETE FROM content_tags WHERE content_id = ?').run(contentId);

  if (technologyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)');
    for (const tid of technologyIds) stmt.run(contentId, tid);
  }

  if (companyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)');
    for (const cid of companyIds) stmt.run(contentId, cid);
  }

  if (tagIds?.length) {
    const stmt = db.prepare('INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)');
    for (const tid of tagIds) stmt.run(contentId, tid);
  }

  res.json({ id: contentId, status: status || 'APPROVED' });
}

// Admin: delete content
export function deleteAdminContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM content WHERE id = ?').run(req.params['id']);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  res.json({ message: 'Content deleted' });
}

// Admin: approve content
export function approveContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE content SET status = 'APPROVED', review_note = NULL, updated_at = ? WHERE id = ?
  `).run(now, req.params['id']);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  res.json({ message: 'Content approved' });
}

// Admin: reject content
export function rejectContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const { reviewNote } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE content SET status = 'REJECTED', review_note = ?, updated_at = ? WHERE id = ?
  `).run(reviewNote || null, now, req.params['id']);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  res.json({ message: 'Content rejected' });
}

// Contributor: get own content
export function getContributorContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['c.author_id = ?'];
  const params: unknown[] = [req.user!.userId];

  if (req.query['status']) {
    conditions.push('c.status = ?');
    params.push(req.query['status']);
  }

  const where = conditions.join(' AND ');

  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM content c WHERE ${where}
  `).get(...params) as { count: number }).count;

  const rows = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE ${where}
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ContentRow[];

  const data = rows.map(row => {
    const relations = attachRelations(db, row.id);
    return formatContent(row, relations);
  });

  res.json({ data, total, page, limit });
}

// Contributor: get own content by ID
export function getContributorContentById(req: AuthRequest, res: Response): void {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = ? AND c.author_id = ?
  `).get(req.params['id'], req.user!.userId) as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = attachRelations(db, row.id);
  res.json({ data: formatContent(row, relations) });
}

// Contributor: create content (always DRAFT)
export function createContributorContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const id = randomUUID();
  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds,
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO content (id, title, body, content_type, difficulty, code_snippet, code_language, status, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
  `).run(id, title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, req.user!.userId, now, now);

  if (technologyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)');
    for (const tid of technologyIds) stmt.run(id, tid);
  }

  if (companyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)');
    for (const cid of companyIds) stmt.run(id, cid);
  }

  if (tagIds?.length) {
    const stmt = db.prepare('INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)');
    for (const tid of tagIds) stmt.run(id, tid);
  }

  res.status(201).json({ id, status: 'DRAFT' });
}

// Contributor: update own content (only DRAFT or REJECTED)
export function updateContributorContent(req: AuthRequest, res: Response): void {
  const db = getDb();
  const contentId = req.params['id'];

  const existing = db.prepare(
    'SELECT id, status, author_id FROM content WHERE id = ?'
  ).get(contentId) as { id: string; status: string; author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  if (existing.author_id !== req.user!.userId) {
    res.status(403).json({ error: 'You can only edit your own content' });
    return;
  }

  if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
    res.status(400).json({ error: 'Only DRAFT or REJECTED content can be edited' });
    return;
  }

  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds,
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE content SET title = ?, body = ?, content_type = ?, difficulty = ?,
    code_snippet = ?, code_language = ?, status = 'DRAFT', review_note = NULL, updated_at = ?
    WHERE id = ?
  `).run(title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, now, contentId);

  db.prepare('DELETE FROM content_technologies WHERE content_id = ?').run(contentId);
  db.prepare('DELETE FROM content_companies WHERE content_id = ?').run(contentId);
  db.prepare('DELETE FROM content_tags WHERE content_id = ?').run(contentId);

  if (technologyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)');
    for (const tid of technologyIds) stmt.run(contentId, tid);
  }

  if (companyIds?.length) {
    const stmt = db.prepare('INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)');
    for (const cid of companyIds) stmt.run(contentId, cid);
  }

  if (tagIds?.length) {
    const stmt = db.prepare('INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)');
    for (const tid of tagIds) stmt.run(contentId, tid);
  }

  res.json({ id: contentId, status: 'DRAFT' });
}

// Contributor: submit for review
export function submitForReview(req: AuthRequest, res: Response): void {
  const db = getDb();
  const contentId = req.params['id'];

  const existing = db.prepare(
    'SELECT id, status, author_id FROM content WHERE id = ?'
  ).get(contentId) as { id: string; status: string; author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  if (existing.author_id !== req.user!.userId) {
    res.status(403).json({ error: 'You can only submit your own content' });
    return;
  }

  if (existing.status !== 'DRAFT') {
    res.status(400).json({ error: 'Only DRAFT content can be submitted for review' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE content SET status = 'PENDING_REVIEW', updated_at = ? WHERE id = ?
  `).run(now, contentId);

  res.json({ message: 'Submitted for review' });
}
