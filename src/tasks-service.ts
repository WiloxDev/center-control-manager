import type { DatabaseSync } from 'node:sqlite';
import { MissionControlDb } from './db.ts';
import type { ProjectTask, TaskNote, AuditLogEntry, Priority, TaskStatus, TaskCategory } from './types.ts';

export class TasksService {
  private db: DatabaseSync;

  constructor(customDb?: DatabaseSync) {
    if (customDb) {
      this.db = customDb;
    } else {
      const mcDb = new MissionControlDb();
      this.db = mcDb.getDb();
    }
  }

  getTasks(options: {
    project?: string;
    status?: string;
    priority?: string;
    search?: string;
    originSessionId?: string;
    includeNotes?: boolean;
    limit?: number;
    offset?: number;
  } = {}): ProjectTask[] {
    const { project, status, priority, search, originSessionId, includeNotes = true, limit = 100, offset = 0 } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('project = ?');
      params.push(project);
    }

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority && priority !== 'all') {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (originSessionId) {
      conditions.push('origin_session_id = ?');
      params.push(originSessionId);
    }

    if (search && search.trim().length > 0) {
      conditions.push('(title LIKE ? OR description LIKE ? OR tags_json LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        id, project, title, description, category, priority, status,
        due_date as dueDate, origin_session_id as originSessionId, tags_json as tagsJson, created_at as createdAt,
        updated_at as updatedAt, completed_at as completedAt, sort_order as sortOrder
      FROM tasks
      ${whereClause}
      ORDER BY 
        CASE status 
          WHEN 'IN_PROGRESS' THEN 1 
          WHEN 'PENDING' THEN 2 
          WHEN 'DEFERRED' THEN 3 
          WHEN 'COMPLETED' THEN 4 
          ELSE 5 
        END,
        CASE priority 
          WHEN 'HIGH' THEN 1 
          WHEN 'MEDIUM' THEN 2 
          WHEN 'LOW' THEN 3 
          ELSE 4 
        END,
        created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    try {
      const rows = this.db.prepare(sql).all(...params) as any[];
      const tasks: ProjectTask[] = rows.map((r) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(r.tagsJson || '[]');
        } catch {
          tags = [];
        }

        const task: ProjectTask = {
          id: r.id,
          project: r.project,
          title: r.title,
          description: r.description,
          category: r.category as TaskCategory,
          priority: r.priority as Priority,
          status: r.status as TaskStatus,
          dueDate: r.dueDate || undefined,
          originSessionId: r.originSessionId || undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          completedAt: r.completedAt || undefined,
          tags,
          notes: [],
        };
        return task;
      });

      if (includeNotes && tasks.length > 0) {
        const notesStmt = this.db.prepare(`
          SELECT id, task_id as taskId, author, content, created_at as createdAt
          FROM task_notes
          ORDER BY created_at ASC
        `);
        const allNotes = notesStmt.all() as any[];
        const notesByTask = new Map<string, TaskNote[]>();
        for (const n of allNotes) {
          if (!notesByTask.has(n.taskId)) {
            notesByTask.set(n.taskId, []);
          }
          notesByTask.get(n.taskId)!.push({
            id: n.id,
            taskId: n.taskId,
            author: n.author,
            content: n.content,
            createdAt: n.createdAt,
          });
        }

        for (const t of tasks) {
          t.notes = notesByTask.get(t.id) || [];
        }
      }

      return tasks;
    } catch (err: any) {
      console.error('[TASKS QUERY ERROR]:', err?.message);
      return [];
    }
  }

  getTaskById(id: string): ProjectTask | null {
    const list = this.getTasks({ includeNotes: true });
    return list.find((t) => t.id === id) || null;
  }

  getTasksBySession(sessionId: string): ProjectTask[] {
    return this.getTasks({ originSessionId: sessionId, includeNotes: true });
  }

  createTask(data: {
    project: string;
    title: string;
    description?: string;
    category?: TaskCategory;
    priority?: Priority;
    status?: TaskStatus;
    dueDate?: string;
    originSessionId?: string;
    tags?: string[];
  }): ProjectTask {
    const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const category = data.category || 'FEATURE';
    const priority = data.priority || 'MEDIUM';
    const status = data.status || 'PENDING';
    const description = data.description || '';
    const tags = data.tags || [];
    const dueDate = data.dueDate || null;
    const originSessionId = data.originSessionId || null;

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, project, title, description, category, priority, status, due_date, origin_session_id, tags_json, created_at, updated_at, completed_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.project, data.title, description, category, priority, status, dueDate, originSessionId, JSON.stringify(tags), now, now, null, 0);

    this.logAudit({
      eventType: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: id,
      project: data.project,
      description: `Creación de tarea: "${data.title}" [${priority}]${originSessionId ? ' (Derivada de sesión ' + originSessionId.substring(0, 8) + ')' : ''}`,
    });

    return {
      id,
      project: data.project,
      title: data.title,
      description,
      category,
      priority,
      status,
      dueDate: dueDate || undefined,
      originSessionId: originSessionId || undefined,
      createdAt: now,
      updatedAt: now,
      tags,
      notes: [],
    };
  }

  updateTask(
    id: string,
    updates: {
      status?: TaskStatus;
      priority?: Priority;
      title?: string;
      description?: string;
      dueDate?: string | null;
      originSessionId?: string | null;
      tags?: string[];
    }
  ): ProjectTask | null {
    const existing = this.getTaskById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
      if (updates.status === 'COMPLETED') {
        fields.push('completed_at = ?');
        params.push(now);
      } else {
        fields.push('completed_at = NULL');
      }
    }

    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      params.push(updates.priority);
    }

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (updates.dueDate !== undefined) {
      fields.push('due_date = ?');
      params.push(updates.dueDate);
    }

    if (updates.originSessionId !== undefined) {
      fields.push('origin_session_id = ?');
      params.push(updates.originSessionId);
    }

    if (updates.tags !== undefined) {
      fields.push('tags_json = ?');
      params.push(JSON.stringify(updates.tags));
    }

    params.push(id);
    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);

    if (updates.status && updates.status !== existing.status) {
      this.logAudit({
        eventType: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityId: id,
        project: existing.project,
        description: `Estado cambiado de ${existing.status} a ${updates.status} para "${existing.title}"`,
      });
    }

    return this.getTaskById(id);
  }

  updateTaskStatus(id: string, status: TaskStatus): ProjectTask | null {
    return this.updateTask(id, { status });
  }

  addNote(taskId: string, noteData: { author?: 'j0k3r' | 'ai' | 'system'; content: string }): TaskNote | null {
    const existing = this.getTaskById(taskId);
    if (!existing) return null;

    const id = `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const author = noteData.author || 'j0k3r';

    const stmt = this.db.prepare(`
      INSERT INTO task_notes (id, task_id, author, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, taskId, author, noteData.content, now);

    this.logAudit({
      eventType: 'TASK_NOTE_ADDED',
      entityType: 'NOTE',
      entityId: id,
      project: existing.project,
      description: `Nota agregada por [${author}] en "${existing.title}": "${noteData.content.substring(0, 50)}..."`,
    });

    return {
      id,
      taskId,
      author,
      content: noteData.content,
      createdAt: now,
    };
  }

  logAudit(entry: {
    eventType: AuditLogEntry['eventType'];
    entityType: AuditLogEntry['entityType'];
    entityId: string;
    project: string;
    description: string;
  }) {
    const id = `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_log (id, event_type, entity_type, entity_id, project, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, entry.eventType, entry.entityType, entry.entityId, entry.project, entry.description, now);
    } catch (err: any) {
      console.warn('[AUDIT LOG ERROR]:', err?.message);
    }
  }

  getAuditLog(options: { project?: string; limit?: number } = {}): AuditLogEntry[] {
    const { project, limit = 50 } = options;
    const conditions: string[] = [];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('project = ?');
      params.push(project);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, event_type as eventType, entity_type as entityType, entity_id as entityId, project, description, created_at as createdAt
      FROM audit_log
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    try {
      return this.db.prepare(sql).all(...params) as unknown as AuditLogEntry[];
    } catch {
      return [];
    }
  }
}
