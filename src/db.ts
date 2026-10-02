import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { ProjectSetting } from './types.ts';

const DB_PATH = path.resolve(process.cwd(), 'data/mission-control.db');
const LEGACY_JSON_PATH = path.resolve(process.cwd(), 'data/tasks.json');

export class MissionControlDb {
  private db: DatabaseSync;

  constructor(customPath: string = DB_PATH) {
    const dir = path.dirname(customPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(customPath);
    this.initTables();
    this.migrateLegacyTasksIfEmpty();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'FEATURE',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        status TEXT NOT NULL DEFAULT 'PENDING',
        due_date TEXT,
        origin_session_id TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS task_notes (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'j0k3r',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        project TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_settings (
        project TEXT PRIMARY KEY,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        alias TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure origin_session_id column exists if table was created previously without it
    try {
      this.db.exec('ALTER TABLE tasks ADD COLUMN origin_session_id TEXT;');
    } catch {
      // Column already exists
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_origin_session ON tasks(origin_session_id);
      CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
    `);
  }

  private migrateLegacyTasksIfEmpty() {
    const countRow = this.db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
    if (countRow && countRow.count > 0) {
      return;
    }

    if (fs.existsSync(LEGACY_JSON_PATH)) {
      try {
        const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
        const legacyTasks: any[] = JSON.parse(raw);
        if (Array.isArray(legacyTasks) && legacyTasks.length > 0) {
          const insertStmt = this.db.prepare(`
            INSERT INTO tasks (id, project, title, description, category, priority, status, due_date, origin_session_id, tags_json, created_at, updated_at, completed_at, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const t of legacyTasks) {
            insertStmt.run(
              t.id,
              t.project,
              t.title,
              t.description || '',
              t.category || 'FEATURE',
              t.priority || 'MEDIUM',
              t.status || 'PENDING',
              t.dueDate || null,
              t.originSessionId || null,
              JSON.stringify(t.tags || []),
              t.createdAt || new Date().toISOString(),
              t.updatedAt || t.createdAt || new Date().toISOString(),
              t.completedAt || null,
              0
            );
          }
          console.log(`[DB MIGRATION] Migrated ${legacyTasks.length} legacy tasks from tasks.json to SQLite.`);
        }
      } catch (err: any) {
        console.warn('[DB MIGRATION WARNING]:', err?.message);
      }
    }
  }

  getProjectSettings(): Map<string, ProjectSetting> {
    const map = new Map<string, ProjectSetting>();
    try {
      const rows = this.db.prepare(`SELECT project, is_favorite, is_hidden, alias, updated_at FROM project_settings`).all() as any[];
      for (const r of rows) {
        map.set(r.project, {
          project: r.project,
          isFavorite: Boolean(r.is_favorite),
          isHidden: Boolean(r.is_hidden),
          alias: r.alias || undefined,
          updatedAt: r.updated_at,
        });
      }
    } catch (err: any) {
      console.warn('[GET PROJECT SETTINGS ERROR]:', err?.message);
    }
    return map;
  }

  saveProjectSetting(project: string, setting: { isFavorite?: boolean; isHidden?: boolean; alias?: string | null }): ProjectSetting {
    const existingMap = this.getProjectSettings();
    const existing = existingMap.get(project);
    const isFavorite = setting.isFavorite !== undefined ? setting.isFavorite : (existing?.isFavorite ?? false);
    const isHidden = setting.isHidden !== undefined ? setting.isHidden : (existing?.isHidden ?? false);
    const alias = setting.alias !== undefined ? (setting.alias || null) : (existing?.alias || null);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO project_settings (project, is_favorite, is_hidden, alias, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project) DO UPDATE SET
        is_favorite = excluded.is_favorite,
        is_hidden = excluded.is_hidden,
        alias = excluded.alias,
        updated_at = excluded.updated_at
    `);

    stmt.run(project, isFavorite ? 1 : 0, isHidden ? 1 : 0, alias, now);

    return {
      project,
      isFavorite,
      isHidden,
      alias: alias || undefined,
      updatedAt: now,
    };
  }

  getDb(): DatabaseSync {
    return this.db;
  }
}
