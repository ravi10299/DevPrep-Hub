import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const isServerless = !!(process.env['VERCEL'] || process.env['AWS_LAMBDA_FUNCTION_NAME']);
const DB_DIR = isServerless ? '/tmp/data' : join(process.cwd(), 'data');
mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = process.env['DATABASE_URL']?.replace('file:', '') ||
  join(DB_DIR, 'devprep.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CONTRIBUTOR')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS technology_domains (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS technologies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      domain_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (domain_id) REFERENCES technology_domains(id)
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK (content_type IN (
        'QUESTION','CONCEPT','NOTE','CODE_EXAMPLE','CHEAT_SHEET',
        'INTERVIEW_EXPERIENCE','PREPARATION_GUIDE','SYSTEM_DESIGN','DSA'
      )),
      difficulty TEXT CHECK (difficulty IN ('Easy','Medium','Hard') OR difficulty IS NULL),
      code_snippet TEXT,
      code_language TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT','PENDING_REVIEW','APPROVED','REJECTED'
      )),
      review_note TEXT,
      author_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS content_technologies (
      content_id TEXT NOT NULL,
      technology_id TEXT NOT NULL,
      PRIMARY KEY (content_id, technology_id),
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
      FOREIGN KEY (technology_id) REFERENCES technologies(id)
    );

    CREATE TABLE IF NOT EXISTS content_companies (
      content_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      PRIMARY KEY (content_id, company_id),
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS content_tags (
      content_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (content_id, tag_id),
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );

    CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
    CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
    CREATE INDEX IF NOT EXISTS idx_content_author ON content(author_id);
    CREATE INDEX IF NOT EXISTS idx_content_difficulty ON content(difficulty);
    CREATE INDEX IF NOT EXISTS idx_technologies_domain ON technologies(domain_id);
  `);
}
