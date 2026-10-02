import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import type {
  EngramObservation,
  EngramSession,
  EngramPrompt,
  CloudSyncStatus,
  SessionBriefing,
  ParsedSessionSummary,
} from './types.ts';

const ENGRAM_DB_PATH = process.env.ENGRAM_DB_PATH || path.join(os.homedir(), '.engram', 'engram.db');

export function normalizeUtcTimestamp(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';
  if (s.endsWith('Z')) return s;
  if (s.match(/[+-]\d{2}:?\d{2}$/)) return s;
  if (s.includes('T')) return `${s}Z`;
  return `${s.replace(' ', 'T')}Z`;
}

export class EngramService {
  private db: DatabaseSync | null = null;
  private dbPath: string;

  constructor(dbPath: string = ENGRAM_DB_PATH) {
    this.dbPath = dbPath;
    this.connect();
  }

  getDbPath(): string {
    return this.dbPath;
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  private connect() {
    try {
      this.db = new DatabaseSync(this.dbPath, { readOnly: true });
    } catch (err: any) {
      console.warn(`[ENGRAM SERVICE] Could not connect to SQLite at ${this.dbPath}:`, err?.message);
      this.db = null;
    }
  }

  getObservations(options: {
    project?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): EngramObservation[] {
    if (!this.db) return [];

    const { project, type, search, limit = 50, offset = 0 } = options;
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('project = ?');
      params.push(project);
    }

    if (type && type !== 'all') {
      if (type === 'decision' || type === 'architecture') {
        conditions.push("type IN ('decision', 'architecture', 'architectural_decision', 'architecture_decision')");
      } else {
        conditions.push('type = ?');
        params.push(type);
      }
    }

    // Use FTS5 trigrams if search term is provided
    let ftsJoined = false;
    if (search && search.trim().length > 0) {
      const cleanTerm = search.trim().replace(/['"*]/g, '');
      if (cleanTerm.length >= 2) {
        conditions.push(`id IN (SELECT rowid FROM observations_fts WHERE observations_fts MATCH ?)`);
        params.push(cleanTerm);
        ftsJoined = true;
      } else {
        conditions.push('(title LIKE ? OR content LIKE ? OR topic_key LIKE ?)');
        const term = `%${cleanTerm}%`;
        params.push(term, term, term);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        id, sync_id as syncId, session_id as sessionId, type, title, content,
        project, scope, topic_key as topicKey, pinned,
        created_at as createdAt, updated_at as updatedAt
      FROM observations
      ${whereClause}
      ORDER BY pinned DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    try {
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];
      return rows.map((r) => ({
        ...r,
        createdAt: normalizeUtcTimestamp(r.createdAt),
        updatedAt: normalizeUtcTimestamp(r.updatedAt),
      })) as unknown as EngramObservation[];
    } catch (err: any) {
      if (ftsJoined && search) {
        return this.getObservationsFallback({ project, type, search, limit, offset });
      }
      console.error('[ENGRAM QUERY ERROR]:', err?.message);
      return [];
    }
  }

  private getObservationsFallback(options: {
    project?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): EngramObservation[] {
    if (!this.db) return [];
    const { project, type, search, limit = 50, offset = 0 } = options;
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('project = ?');
      params.push(project);
    }
    if (type && type !== 'all') {
      if (type === 'decision' || type === 'architecture') {
        conditions.push("type IN ('decision', 'architecture', 'architectural_decision', 'architecture_decision')");
      } else {
        conditions.push('type = ?');
        params.push(type);
      }
    }
    if (search && search.trim().length > 0) {
      conditions.push('(title LIKE ? OR content LIKE ? OR topic_key LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        id, sync_id as syncId, session_id as sessionId, type, title, content,
        project, scope, topic_key as topicKey, pinned,
        created_at as createdAt, updated_at as updatedAt
      FROM observations
      ${whereClause}
      ORDER BY pinned DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    try {
      const rows = this.db.prepare(query).all(...params) as any[];
      return rows.map((r) => ({
        ...r,
        createdAt: normalizeUtcTimestamp(r.createdAt),
        updatedAt: normalizeUtcTimestamp(r.updatedAt),
      })) as unknown as EngramObservation[];
    } catch {
      return [];
    }
  }

  getSessions(options: { project?: string; limit?: number } = {}): EngramSession[] {
    if (!this.db) return [];
    const { project, limit = 30 } = options;
    const conditions: string[] = [];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('s.project = ?');
      params.push(project);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        s.id, s.project, s.directory, s.started_at as startedAt, s.ended_at as endedAt, s.summary,
        (s.ended_at IS NULL) as active,
        (SELECT count(*) FROM user_prompts p WHERE p.session_id = s.id) as promptsCount,
        (SELECT count(*) FROM observations o WHERE o.session_id = s.id AND o.deleted_at IS NULL) as observationsCount
      FROM sessions s
      ${whereClause}
      ORDER BY s.started_at DESC
      LIMIT ?
    `;
    params.push(limit);

    try {
      const rows = this.db.prepare(sql).all(...params) as any[];
      return rows.map((r) => ({
        id: r.id,
        project: r.project,
        directory: r.directory,
        startedAt: normalizeUtcTimestamp(r.startedAt),
        endedAt: r.endedAt ? normalizeUtcTimestamp(r.endedAt) : undefined,
        summary: r.summary || undefined,
        active: Boolean(r.active),
        promptsCount: Number(r.promptsCount || 0),
        observationsCount: Number(r.observationsCount || 0),
      }));
    } catch (err: any) {
      console.error('[ENGRAM SESSIONS ERROR]:', err?.message);
      return [];
    }
  }

  getRecentPrompts(options: { project?: string; limit?: number } = {}): EngramPrompt[] {
    if (!this.db) return [];
    const { project, limit = 40 } = options;
    const conditions: string[] = [];
    const params: any[] = [];

    if (project && project !== 'all') {
      conditions.push('project = ?');
      params.push(project);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, session_id as sessionId, project, content, created_at as createdAt
      FROM user_prompts
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `;
    params.push(limit);

    try {
      const rows = this.db.prepare(sql).all(...params) as any[];
      return rows.map((r) => ({
        ...r,
        createdAt: normalizeUtcTimestamp(r.createdAt),
      })) as unknown as EngramPrompt[];
    } catch {
      return [];
    }
  }

  getSessionBriefing(sessionId: string): SessionBriefing | null {
    if (!this.db) return null;

    try {
      // 1. Session info
      const sessionRow = this.db.prepare(`
        SELECT 
          s.id, s.project, s.directory, s.started_at as startedAt, s.ended_at as endedAt, s.summary,
          (s.ended_at IS NULL) as active
        FROM sessions s
        WHERE s.id = ?
      `).get(sessionId) as any;

      let isHistoricalEngram = false;
      let sourceProject = 'unknown';

      if (!sessionRow) {
        // Fallback: If session not found directly in sessions table, try finding it via observations or prompts
        const obsRow = this.db.prepare(`SELECT project, created_at FROM observations WHERE session_id = ? LIMIT 1`).get(sessionId) as any;
        if (!obsRow) {
          // Return a structured error response instead of null for better UX
          return this.createErrorSessionBriefing(sessionId, 'Session not found in database');
        }
        sourceProject = obsRow.project || 'unknown';
        isHistoricalEngram = true; // Mark as historical since we're falling back to observations
        sessionRow = {
          id: sessionId,
          project: sourceProject,
          directory: '',
          startedAt: obsRow.created_at,
          endedAt: null,
          summary: null,
          active: false,
        };
      } else {
        sourceProject = sessionRow.project;
        // Check if this project is marked as historical in our system
        // We could check project stats or settings, but for now we'll infer from lack of git info
        // A more robust solution would check project enrollment or settings
      }

      sessionRow.startedAt = normalizeUtcTimestamp(sessionRow.startedAt);
      if (sessionRow.endedAt) sessionRow.endedAt = normalizeUtcTimestamp(sessionRow.endedAt);

      // 2. Prompts
      const promptRows = this.db.prepare(`
        SELECT id, session_id as sessionId, project, content, created_at as createdAt
        FROM user_prompts
        WHERE session_id = ?
        ORDER BY id ASC
      `).all(sessionId) as any[];
      const prompts = promptRows.map((p) => ({
        ...p,
        createdAt: normalizeUtcTimestamp(p.createdAt),
      })) as unknown as EngramPrompt[];

      // 3. Observations
      const obsRows = this.db.prepare(`
        SELECT 
          id, sync_id as syncId, session_id as sessionId, type, title, content,
          project, scope, topic_key as topicKey, pinned,
          created_at as createdAt, updated_at as updatedAt
        FROM observations
        WHERE session_id = ? AND deleted_at IS NULL
        ORDER BY id ASC
      `).all(sessionId) as any[];
      const observations = obsRows.map((o) => ({
        ...o,
        createdAt: normalizeUtcTimestamp(o.createdAt),
        updatedAt: normalizeUtcTimestamp(o.updatedAt),
      })) as unknown as EngramObservation[];

      // 4. Raw summary: prefer session_summary observation if exists, otherwise session.summary
      const summaryObs = observations.find((o) => o.type === 'session_summary');
      const summaryRaw = summaryObs?.content || sessionRow.summary || '';

      // 5. Parse summary semantically
      const parsed = this.parseSummary(summaryRaw);

      const sessionObj: EngramSession = {
        id: sessionRow.id,
        project: sessionRow.project,
        directory: sessionRow.directory || '',
        startedAt: sessionRow.startedAt,
        endedAt: sessionRow.endedAt || undefined,
        summary: sessionRow.summary || undefined,
        active: Boolean(sessionRow.active),
        promptsCount: prompts.length,
        observationsCount: observations.length,
      };

      return {
        session: sessionObj,
        prompts,
        observations,
        summaryRaw,
        parsedSummary: parsed,
        relatedTasks: [],
        // Additional metadata for UI
        meta: {
          isHistoricalEngram: isHistoricalEngram,
          sourceProject: sourceProject,
          fetchedAt: new Date().toISOString(),
          readOnly: true // All Engram data is read-only
        }
      };
    } catch (err: any) {
      console.error('[GET SESSION BRIEFING ERROR]:', err?.message);
      return this.createErrorSessionBriefing(sessionId, err?.message || 'Unknown error');
    }
  }

  /**
   * Helper to create a structured error response for better UX
   * instead of returning null
   */
  private createErrorSessionBriefing(sessionId: string, errorMessage: string): SessionBriefing {
    // Return a minimal but valid session briefing that indicates the error
    const errorSession: EngramSession = {
      id: sessionId,
      project: 'unknown',
      directory: '',
      startedAt: new Date().toISOString(),
      endedAt: undefined,
      summary: undefined,
      active: false,
      promptsCount: 0,
      observationsCount: 0,
    };

    return {
      session: errorSession,
      prompts: [],
      observations: [],
      summaryRaw: `Error loading session: ${errorMessage}`,
      parsedSummary: {
        goal: undefined,
        instructions: undefined,
        discoveries: [`Failed to load session briefing: ${errorMessage}`],
        accomplished: [],
        keyDecisions: [],
        nextSteps: [`Please verify the session ID is correct and try again`],
        relevantFiles: []
      },
      relatedTasks: [],
      meta: {
        isError: true,
        errorMessage: errorMessage,
        fetchedAt: new Date().toISOString(),
        readOnly: true
      }
    };
  }

  private parseSummary(raw: string): ParsedSessionSummary {
    const result: ParsedSessionSummary = {
      goal: undefined,
      instructions: undefined,
      discoveries: [],
      accomplished: [],
      keyDecisions: [],
      nextSteps: [],
      relevantFiles: [],
    };

    if (!raw || !raw.trim()) return result;

    const lines = raw.split('\n');
    let currentSection: string | null = null;
    let sectionLines: string[] = [];

    const flushSection = (section: string | null, linesArr: string[]) => {
      if (!section) return;
      const text = linesArr.join('\n').trim();
      if (!text) return;

      if (section === 'goal') {
        result.goal = text;
      } else if (section === 'instructions') {
        result.instructions = text;
      } else if (section === 'discoveries') {
        result.discoveries = this.extractBullets(linesArr);
      } else if (section === 'accomplished') {
        result.accomplished = this.extractBullets(linesArr);
      } else if (section === 'key decisions' || section === 'decisions') {
        result.keyDecisions = this.extractBullets(linesArr);
      } else if (section === 'next steps') {
        result.nextSteps = this.extractBullets(linesArr);
      } else if (section === 'relevant files') {
        result.relevantFiles = this.extractBullets(linesArr);
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const headingMatch = trimmed.match(/^##\s+(.+)$/i);
      const colonMatch = trimmed.match(/^(Goal|Instructions|Discoveries|Accomplished|Key Decisions|Next Steps|Relevant Files):/i);

      if (headingMatch) {
        flushSection(currentSection, sectionLines);
        currentSection = headingMatch[1].toLowerCase().trim();
        sectionLines = [];
      } else if (colonMatch) {
        flushSection(currentSection, sectionLines);
        currentSection = colonMatch[1].toLowerCase().trim();
        const rest = trimmed.substring(colonMatch[0].length).trim();
        sectionLines = rest ? [rest] : [];
      } else {
        sectionLines.push(line);
      }
    }
    flushSection(currentSection, sectionLines);

    return result;
  }

  private extractBullets(linesArr: string[]): string[] {
    const bullets: string[] = [];
    for (const l of linesArr) {
      const clean = l.trim();
      if (!clean) continue;
      // Strip markdown bullets: - [x], - [ ], *, 1., etc.
      const bulletMatch = clean.match(/^[-*•]\s+(?:\[[ xX]\]\s+)?(.+)$/) || clean.match(/^\d+\.\s+(.+)$/);
      if (bulletMatch) {
        bullets.push(bulletMatch[1].trim());
      } else if (clean.length > 0 && !clean.startsWith('#')) {
        bullets.push(clean);
      }
    }
    return bullets;
  }

  getCloudSyncStatus(): CloudSyncStatus {
    if (!this.db) {
      return {
        configured: false,
        lifecycle: 'offline',
        lastEnqueuedSeq: 0,
        lastAckedSeq: 0,
        pendingMutations: 0,
        enrolledProjects: [],
      };
    }

    try {
      const syncRow = this.db.prepare(`SELECT * FROM sync_state WHERE target_key = 'cloud'`).get() as any;
      const enrolledRows = this.db.prepare(`SELECT project FROM sync_enrolled_projects`).all() as any[];
      const pendingRow = this.db.prepare(`SELECT count(*) as count FROM sync_mutations WHERE acked_at IS NULL`).get() as any;

      const enrolled = enrolledRows.map((r) => r.project);
      const isConfigured = Boolean(syncRow && syncRow.target_key);

      return {
        configured: isConfigured,
        lifecycle: syncRow?.lifecycle || 'idle',
        lastEnqueuedSeq: Number(syncRow?.last_enqueued_seq || 0),
        lastAckedSeq: Number(syncRow?.last_acked_seq || 0),
        pendingMutations: Number(pendingRow?.count || 0),
        enrolledProjects: enrolled,
        lastSyncAt: syncRow?.last_success_at || undefined,
      };
    } catch {
      return {
        configured: false,
        lifecycle: 'unknown',
        lastEnqueuedSeq: 0,
        lastAckedSeq: 0,
        pendingMutations: 0,
        enrolledProjects: [],
      };
    }
  }

  getProjectStats(): Record<string, { total: number; decisions: number; bugfixes: number; summaries: number }> {
    if (!this.db) return {};

    try {
      const stmt = this.db.prepare(`
        SELECT 
          project,
          count(*) as total,
          sum(case when type in ('decision', 'architecture', 'architectural_decision', 'architecture_decision') then 1 else 0 end) as decisions,
          sum(case when type = 'bugfix' then 1 else 0 end) as bugfixes,
          sum(case when type = 'session_summary' then 1 else 0 end) as summaries
        FROM observations
        WHERE deleted_at IS NULL
        GROUP BY project
      `);

      const rows = stmt.all() as any[];
      const result: Record<string, any> = {};
      for (const r of rows) {
        result[r.project] = {
          total: Number(r.total || 0),
          decisions: Number(r.decisions || 0),
          bugfixes: Number(r.bugfixes || 0),
          summaries: Number(r.summaries || 0),
        };
      }
      return result;
    } catch (err: any) {
      console.error('[ENGRAM STATS ERROR]:', err?.message);
      return {};
    }
  }
}
