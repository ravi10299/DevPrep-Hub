import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getClient } from '../db/database.js';
import { getCached, setCache, invalidateCache } from '../cache.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import type { Client, InStatement, InValue } from '@libsql/client';

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
  author_portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

async function attachRelations(db: Client, contentId: string) {
  const [techResult, companyResult, tagResult] = await Promise.all([
    db.execute({
      sql: `SELECT t.id, t.name, t.slug, t.icon, td.name as domain_name, td.slug as domain_slug
            FROM content_technologies ct
            JOIN technologies t ON ct.technology_id = t.id
            JOIN technology_domains td ON t.domain_id = td.id
            WHERE ct.content_id = ?`,
      args: [contentId],
    }),
    db.execute({
      sql: `SELECT c.id, c.name, c.slug
            FROM content_companies cc
            JOIN companies c ON cc.company_id = c.id
            WHERE cc.content_id = ?`,
      args: [contentId],
    }),
    db.execute({
      sql: `SELECT t.id, t.name, t.slug
            FROM content_tags ct
            JOIN tags t ON ct.tag_id = t.id
            WHERE ct.content_id = ?`,
      args: [contentId],
    }),
  ]);

  return {
    technologies: techResult.rows as unknown as { id: string; name: string; slug: string; icon: string; domain_name: string; domain_slug: string }[],
    companies: companyResult.rows as unknown as { id: string; name: string; slug: string }[],
    tags: tagResult.rows as unknown as { id: string; name: string; slug: string }[],
  };
}

type RelationMap = Record<string, Awaited<ReturnType<typeof attachRelations>>>;

async function batchAttachRelations(db: Client, contentIds: string[]): Promise<RelationMap> {
  if (contentIds.length === 0) return {};

  const placeholders = contentIds.map(() => '?').join(',');

  const [techResult, companyResult, tagResult] = await Promise.all([
    db.execute({
      sql: `SELECT ct.content_id, t.id, t.name, t.slug, t.icon, td.name as domain_name, td.slug as domain_slug
            FROM content_technologies ct
            JOIN technologies t ON ct.technology_id = t.id
            JOIN technology_domains td ON t.domain_id = td.id
            WHERE ct.content_id IN (${placeholders})`,
      args: contentIds,
    }),
    db.execute({
      sql: `SELECT cc.content_id, c.id, c.name, c.slug
            FROM content_companies cc
            JOIN companies c ON cc.company_id = c.id
            WHERE cc.content_id IN (${placeholders})`,
      args: contentIds,
    }),
    db.execute({
      sql: `SELECT ct.content_id, t.id, t.name, t.slug
            FROM content_tags ct
            JOIN tags t ON ct.tag_id = t.id
            WHERE ct.content_id IN (${placeholders})`,
      args: contentIds,
    }),
  ]);

  const map: RelationMap = {};
  for (const id of contentIds) {
    map[id] = { technologies: [], companies: [], tags: [] };
  }

  for (const row of techResult.rows) {
    const r = row as unknown as { content_id: string; id: string; name: string; slug: string; icon: string; domain_name: string; domain_slug: string };
    map[r.content_id]?.technologies.push({ id: r.id, name: r.name, slug: r.slug, icon: r.icon, domain_name: r.domain_name, domain_slug: r.domain_slug });
  }

  for (const row of companyResult.rows) {
    const r = row as unknown as { content_id: string; id: string; name: string; slug: string };
    map[r.content_id]?.companies.push({ id: r.id, name: r.name, slug: r.slug });
  }

  for (const row of tagResult.rows) {
    const r = row as unknown as { content_id: string; id: string; name: string; slug: string };
    map[r.content_id]?.tags.push({ id: r.id, name: r.name, slug: r.slug });
  }

  return map;
}

function formatContent(row: ContentRow, relations: Awaited<ReturnType<typeof attachRelations>>) {
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
    authorPortfolioUrl: row.author_portfolio_url,
    technologies: relations.technologies,
    companies: relations.companies,
    tags: relations.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Public: get approved content with filters
export async function getPublicContent(req: Request, res: Response): Promise<void> {
  const cacheKey = `content:list:${req.url}`;
  const cached = getCached<{ data: unknown; total: number; page: number; limit: number }>(cacheKey);
  if (cached) {
    res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json(cached);
    return;
  }

  const db = getClient();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["c.status = 'APPROVED'"];
  const params: InValue[] = [];

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
    params.push(req.query['contentType'] as string);
  }

  if (req.query['difficulty']) {
    conditions.push('c.difficulty = ?');
    params.push(req.query['difficulty'] as string);
  }

  if (req.query['technologyId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_technologies ct4 WHERE ct4.content_id = c.id AND ct4.technology_id = ?)');
    params.push(req.query['technologyId'] as string);
  }

  if (req.query['domainId']) {
    conditions.push(`EXISTS (
      SELECT 1 FROM content_technologies ct5
      JOIN technologies t5 ON ct5.technology_id = t5.id
      WHERE ct5.content_id = c.id AND t5.domain_id = ?
    )`);
    params.push(req.query['domainId'] as string);
  }

  if (req.query['companyId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_companies cc3 WHERE cc3.content_id = c.id AND cc3.company_id = ?)');
    params.push(req.query['companyId'] as string);
  }

  if (req.query['tagId']) {
    conditions.push('EXISTS (SELECT 1 FROM content_tags ct6 WHERE ct6.content_id = c.id AND ct6.tag_id = ?)');
    params.push(req.query['tagId'] as string);
  }

  const where = conditions.join(' AND ');
  const sort = req.query['sort'] === 'oldest' ? 'ASC' : 'DESC';

  const [countResult, rowsResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as count FROM content c WHERE ${where}`, args: params }),
    db.execute({ sql: `SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE ${where} ORDER BY c.created_at ${sort} LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);

  const total = Number(countResult.rows[0]?.['count'] ?? 0);
  const rows = rowsResult.rows as unknown as ContentRow[];

  const relationsMap = await batchAttachRelations(db, rows.map(r => r.id));
  const data = rows.map(row => formatContent(row, relationsMap[row.id]));

  const payload = { data, total, page, limit };
  setCache(cacheKey, payload, 60_000);
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.json(payload);
}

export async function getPublicContentById(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const cacheKey = `content:detail:${id}`;
  const cached = getCached<{ data: unknown }>(cacheKey);
  if (cached) {
    res.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.json(cached);
    return;
  }

  const db = getClient();
  const result = await db.execute({
    sql: `SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE c.id = ? AND c.status = 'APPROVED'`,
    args: [id],
  });
  const row = result.rows[0] as unknown as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = await attachRelations(db, row.id);
  const payload = { data: formatContent(row, relations) };
  setCache(cacheKey, payload, 120_000);
  res.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.json(payload);
}

// Admin: get any content by ID (regardless of status)
export async function getAdminContentById(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE c.id = ?',
    args: [req.params['id'] as string],
  });
  const row = result.rows[0] as unknown as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = await attachRelations(db, row.id);
  res.json({ data: formatContent(row, relations) });
}

// Admin: get all content
export async function getAdminContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: InValue[] = [];

  if (req.query['status']) {
    conditions.push('c.status = ?');
    params.push(req.query['status'] as string);
  }

  if (req.query['contentType']) {
    conditions.push('c.content_type = ?');
    params.push(req.query['contentType'] as string);
  }

  if (req.query['search']) {
    const search = `%${req.query['search']}%`;
    conditions.push('(c.title LIKE ? OR c.body LIKE ?)');
    params.push(search, search);
  }

  const where = conditions.join(' AND ');

  const [countResult, rowsResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as count FROM content c WHERE ${where}`, args: params }),
    db.execute({ sql: `SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);

  const total = Number(countResult.rows[0]?.['count'] ?? 0);
  const rows = rowsResult.rows as unknown as ContentRow[];

  const relationsMap = await batchAttachRelations(db, rows.map(r => r.id));
  const data = rows.map(row => formatContent(row, relationsMap[row.id]));

  res.json({ data, total, page, limit });
}

// Admin: create content (can publish directly)
export async function createAdminContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const id = randomUUID();
  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds, status,
  } = req.body;

  const finalStatus = status || 'APPROVED';
  const now = new Date().toISOString();

  const statements: InStatement[] = [
    {
      sql: 'INSERT INTO content (id, title, body, content_type, difficulty, code_snippet, code_language, status, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, finalStatus, req.user!.userId, now, now],
    },
  ];

  if (technologyIds?.length) {
    for (const tid of technologyIds) {
      statements.push({ sql: 'INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)', args: [id, tid] });
    }
  }

  if (companyIds?.length) {
    for (const cid of companyIds) {
      statements.push({ sql: 'INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)', args: [id, cid] });
    }
  }

  if (tagIds?.length) {
    for (const tid of tagIds) {
      statements.push({ sql: 'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)', args: [id, tid] });
    }
  }

  await db.batch(statements, 'write');
  invalidateCache('content:');
  res.status(201).json({ id, status: finalStatus });
}

// Admin: update content
export async function updateAdminContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const contentId = req.params['id'] as string;

  const existing = await db.execute({ sql: 'SELECT id FROM content WHERE id = ?', args: [contentId] });
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds, status,
  } = req.body;

  const now = new Date().toISOString();

  const statements: InStatement[] = [
    {
      sql: 'UPDATE content SET title = ?, body = ?, content_type = ?, difficulty = ?, code_snippet = ?, code_language = ?, status = ?, updated_at = ? WHERE id = ?',
      args: [title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, status || 'APPROVED', now, contentId],
    },
    { sql: 'DELETE FROM content_technologies WHERE content_id = ?', args: [contentId] },
    { sql: 'DELETE FROM content_companies WHERE content_id = ?', args: [contentId] },
    { sql: 'DELETE FROM content_tags WHERE content_id = ?', args: [contentId] },
  ];

  if (technologyIds?.length) {
    for (const tid of technologyIds) {
      statements.push({ sql: 'INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)', args: [contentId, tid] });
    }
  }

  if (companyIds?.length) {
    for (const cid of companyIds) {
      statements.push({ sql: 'INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)', args: [contentId, cid] });
    }
  }

  if (tagIds?.length) {
    for (const tid of tagIds) {
      statements.push({ sql: 'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)', args: [contentId, tid] });
    }
  }

  await db.batch(statements, 'write');
  invalidateCache('content:');
  res.json({ id: contentId, status: status || 'APPROVED' });
}

// Admin: delete content
export async function deleteAdminContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM content WHERE id = ?', args: [req.params['id'] as string] });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  invalidateCache('content:');
  res.json({ message: 'Content deleted' });
}

// Admin: approve content
export async function approveContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: "UPDATE content SET status = 'APPROVED', review_note = NULL, updated_at = ? WHERE id = ?",
    args: [now, req.params['id'] as string],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  invalidateCache('content:');
  res.json({ message: 'Content approved' });
}

// Admin: reject content
export async function rejectContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const { reviewNote } = req.body;
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: "UPDATE content SET status = 'REJECTED', review_note = ?, updated_at = ? WHERE id = ?",
    args: [reviewNote || null, now, req.params['id'] as string],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  invalidateCache('content:');
  res.json({ message: 'Content rejected' });
}

// Contributor: get own content
export async function getContributorContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['c.author_id = ?'];
  const params: InValue[] = [req.user!.userId];

  if (req.query['status']) {
    conditions.push('c.status = ?');
    params.push(req.query['status'] as string);
  }

  const where = conditions.join(' AND ');

  const [countResult, rowsResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as count FROM content c WHERE ${where}`, args: params }),
    db.execute({ sql: `SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`, args: [...params, limit, offset] }),
  ]);

  const total = Number(countResult.rows[0]?.['count'] ?? 0);
  const rows = rowsResult.rows as unknown as ContentRow[];

  const relationsMap = await batchAttachRelations(db, rows.map(r => r.id));
  const data = rows.map(row => formatContent(row, relationsMap[row.id]));

  res.json({ data, total, page, limit });
}

// Contributor: get own content by ID
export async function getContributorContentById(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT c.*, u.name as author_name, u.portfolio_url as author_portfolio_url FROM content c JOIN users u ON c.author_id = u.id WHERE c.id = ? AND c.author_id = ?',
    args: [req.params['id'] as string, req.user!.userId],
  });
  const row = result.rows[0] as unknown as ContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  const relations = await attachRelations(db, row.id);
  res.json({ data: formatContent(row, relations) });
}

// Contributor: create content (always DRAFT)
export async function createContributorContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const id = randomUUID();
  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds,
  } = req.body;

  const now = new Date().toISOString();

  const statements: InStatement[] = [
    {
      sql: "INSERT INTO content (id, title, body, content_type, difficulty, code_snippet, code_language, status, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)",
      args: [id, title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, req.user!.userId, now, now],
    },
  ];

  if (technologyIds?.length) {
    for (const tid of technologyIds) {
      statements.push({ sql: 'INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)', args: [id, tid] });
    }
  }

  if (companyIds?.length) {
    for (const cid of companyIds) {
      statements.push({ sql: 'INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)', args: [id, cid] });
    }
  }

  if (tagIds?.length) {
    for (const tid of tagIds) {
      statements.push({ sql: 'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)', args: [id, tid] });
    }
  }

  await db.batch(statements, 'write');
  invalidateCache('content:');
  res.status(201).json({ id, status: 'DRAFT' });
}

// Contributor: update own content (only DRAFT or REJECTED)
export async function updateContributorContent(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const contentId = req.params['id'] as string;

  const existing = await db.execute({
    sql: 'SELECT id, status, author_id FROM content WHERE id = ?',
    args: [contentId],
  });
  const row = existing.rows[0] as unknown as { id: string; status: string; author_id: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  if (row.author_id !== req.user!.userId) {
    res.status(403).json({ error: 'You can only edit your own content' });
    return;
  }

  if (row.status !== 'DRAFT' && row.status !== 'REJECTED') {
    res.status(400).json({ error: 'Only DRAFT or REJECTED content can be edited' });
    return;
  }

  const {
    title, body, contentType, difficulty, codeSnippet, codeLanguage,
    technologyIds, companyIds, tagIds,
  } = req.body;

  const now = new Date().toISOString();

  const statements: InStatement[] = [
    {
      sql: "UPDATE content SET title = ?, body = ?, content_type = ?, difficulty = ?, code_snippet = ?, code_language = ?, status = 'DRAFT', review_note = NULL, updated_at = ? WHERE id = ?",
      args: [title, body, contentType, difficulty || null, codeSnippet || null, codeLanguage || null, now, contentId],
    },
    { sql: 'DELETE FROM content_technologies WHERE content_id = ?', args: [contentId] },
    { sql: 'DELETE FROM content_companies WHERE content_id = ?', args: [contentId] },
    { sql: 'DELETE FROM content_tags WHERE content_id = ?', args: [contentId] },
  ];

  if (technologyIds?.length) {
    for (const tid of technologyIds) {
      statements.push({ sql: 'INSERT INTO content_technologies (content_id, technology_id) VALUES (?, ?)', args: [contentId, tid] });
    }
  }

  if (companyIds?.length) {
    for (const cid of companyIds) {
      statements.push({ sql: 'INSERT INTO content_companies (content_id, company_id) VALUES (?, ?)', args: [contentId, cid] });
    }
  }

  if (tagIds?.length) {
    for (const tid of tagIds) {
      statements.push({ sql: 'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)', args: [contentId, tid] });
    }
  }

  await db.batch(statements, 'write');
  invalidateCache('content:');
  res.json({ id: contentId, status: 'DRAFT' });
}

// Contributor: submit for review
export async function submitForReview(req: AuthRequest, res: Response): Promise<void> {
  const db = getClient();
  const contentId = req.params['id'] as string;

  const existing = await db.execute({
    sql: 'SELECT id, status, author_id FROM content WHERE id = ?',
    args: [contentId],
  });
  const row = existing.rows[0] as unknown as { id: string; status: string; author_id: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  if (row.author_id !== req.user!.userId) {
    res.status(403).json({ error: 'You can only submit your own content' });
    return;
  }

  if (row.status !== 'DRAFT') {
    res.status(400).json({ error: 'Only DRAFT content can be submitted for review' });
    return;
  }

  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE content SET status = 'PENDING_REVIEW', updated_at = ? WHERE id = ?",
    args: [now, contentId],
  });

  invalidateCache('content:');
  res.json({ message: 'Submitted for review' });
}
