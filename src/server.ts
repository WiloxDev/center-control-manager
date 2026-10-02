import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { EngramService } from './engram-service.ts';
import { TasksService } from './tasks-service.ts';
import { GitService } from './git-service.ts';
import { MissionControlDb } from './db.ts';
import { TerminalsService } from './terminals-service.ts';
import { CpamcService } from './cpamc-service.ts';
import { TelemetryService } from './telemetry-service.ts';
import type { ProjectSummary, ProjectOrigin } from './types.ts';

const PORT = Number(process.env.PORT || 3099);
const mcDb = new MissionControlDb();
const engram = new EngramService();
const tasks = new TasksService(mcDb.getDb());
const terminals = new TerminalsService();
const cpamc = new CpamcService();
const telemetry = new TelemetryService();

// --- SSE (Server-Sent Events) Manager ---
const sseClients = new Set<http.ServerResponse>();

function broadcastSse(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Watch Engram SQLite directory for live WAL mutations
const ENGRAM_DIR = '/home/wilox/.engram';
if (fs.existsSync(ENGRAM_DIR)) {
  try {
    let watchDebounce: NodeJS.Timeout | null = null;
    fs.watch(ENGRAM_DIR, (_eventType, filename) => {
      if (filename && (filename.includes('engram.db') || filename.includes('wal'))) {
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          broadcastSse('engram-mutation', { timestamp: new Date().toISOString(), filename });
        }, 300);
      }
    });
  } catch (err: any) {
    console.warn('[SSE ENGRAM WATCHER WARNING]:', err?.message);
  }
}

// Watch Herdr directory for live session updates
const HERDR_CONFIG_DIR = '/home/wilox/.config/herdr';
if (fs.existsSync(HERDR_CONFIG_DIR)) {
  try {
    let herdrDebounce: NodeJS.Timeout | null = null;
    fs.watch(HERDR_CONFIG_DIR, (_eventType, filename) => {
      if (filename && (filename.includes('session.json') || filename.includes('herdr.sock'))) {
        if (herdrDebounce) clearTimeout(herdrDebounce);
        herdrDebounce = setTimeout(async () => {
          try {
            const data = await terminals.getDashboardData();
            broadcastSse('terminal-session-updated', data);
          } catch {
            // Ignore
          }
        }, 350);
      }
    });
  } catch (err: any) {
    console.warn('[SSE HERDR WATCHER WARNING]:', err?.message);
  }
}

// Keep-alive heartbeat for SSE connections
setInterval(() => {
  broadcastSse('heartbeat', { time: Date.now() });
}, 15000);

function sendJson(res: http.ServerResponse, data: any, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // --- Real-time SSE Stream ---
  if (url.pathname === '/api/stream' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ connected: true, time: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // --- API Endpoints ---

  if (url.pathname === '/api/health') {
    return sendJson(res, {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      engramConnected: true,
      nodeVersion: process.version,
      sseClientsCount: sseClients.size,
    });
  }

  // Projects list with intelligent classification & settings
  if (url.pathname === '/api/projects') {
    const stats = engram.getProjectStats();
    const cloudStatus = engram.getCloudSyncStatus();
    const allTasks = tasks.getTasks({ includeNotes: false });
    const settingsMap = mcDb.getProjectSettings();

    // 1. Discover local projects in /home/wilox/projects
    const discovered = GitService.discoverProjects();
    const projectMap = new Map<string, {
      path: string;
      exists: boolean;
      isGit: boolean;
      origin: ProjectOrigin;
      branch?: string;
      lastCommit?: string;
      clean?: boolean;
    }>();

    for (const p of discovered) {
      const git = GitService.getRepoInfo(p.path);
      projectMap.set(p.name, {
        path: p.path,
        exists: true,
        isGit: git.isGit,
        origin: git.isGit ? 'LOCAL_GIT' : 'LOCAL_DIR',
        branch: git.branch,
        lastCommit: git.lastCommit,
        clean: git.clean,
      });
    }

    // 2. Merge Engram SQLite projects (including historical Windows/WSL sessions)
    for (const engramProject of Object.keys(stats)) {
      if (!projectMap.has(engramProject) && engramProject.trim().length > 0) {
        const guessedPath = `/home/wilox/projects/${engramProject}`;
        const exists = fs.existsSync(guessedPath);
        const git = exists ? GitService.getRepoInfo(guessedPath) : { isGit: false };

        projectMap.set(engramProject, {
          path: guessedPath,
          exists,
          isGit: git.isGit,
          origin: exists ? (git.isGit ? 'LOCAL_GIT' : 'LOCAL_DIR') : 'HISTORICAL_ENGRAM',
          branch: git.branch,
          lastCommit: git.lastCommit,
          clean: git.clean,
        });
      }
    }

    // Default core favorites if not explicitly set
    const defaultFavorites = new Set(['sio-hotel', 'sio', 'sio-fact']);
    // Default residual projects to hide if not explicitly configured
    const defaultResiduals = new Set(['backend', 'j0k3r', 'projects', 'wilox']);

    const summaries: ProjectSummary[] = Array.from(projectMap.entries()).map(([name, info]) => {
      const pStats = stats[name] || { total: 0, decisions: 0, bugfixes: 0, summaries: 0 };
      const pending = allTasks.filter((t) => t.project === name && t.status !== 'COMPLETED').length;
      const isEnrolled = cloudStatus.enrolledProjects.includes(name);

      const saved = settingsMap.get(name);
      const isFavorite = saved ? saved.isFavorite : defaultFavorites.has(name);
      const isHidden = saved ? saved.isHidden : defaultResiduals.has(name);
      const alias = saved?.alias;

      return {
        name,
        path: info.path,
        exists: info.exists,
        isGitRepo: info.isGit,
        origin: info.origin,
        gitBranch: info.branch,
        lastCommit: info.lastCommit,
        isClean: info.isGit ? info.clean : undefined,
        observationsCount: pStats.total,
        decisionsCount: pStats.decisions,
        bugfixesCount: pStats.bugfixes,
        pendingTasksCount: pending,
        cloudEnrolled: isEnrolled,
        isFavorite,
        isHidden,
        alias,
      };
    });

    // Sort order: Favorites first, then Local Git repos, then Local Dirs, then Historical Engram
    summaries.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      const originWeight = (o: ProjectOrigin) => {
        if (o === 'LOCAL_GIT') return 1;
        if (o === 'LOCAL_DIR') return 2;
        return 3;
      };
      const diff = originWeight(a.origin) - originWeight(b.origin);
      if (diff !== 0) return diff;

      return (b.observationsCount + b.pendingTasksCount) - (a.observationsCount + a.pendingTasksCount);
    });

    return sendJson(res, { success: true, projects: summaries, cloudStatus });
  }

  // Update Project Settings (favorite, hidden, alias)
  if (url.pathname.startsWith('/api/projects/') && url.pathname.endsWith('/settings') && method === 'PATCH') {
    const projectName = decodeURIComponent(url.pathname.replace('/api/projects/', '').replace('/settings', ''));
    let bodyRaw = '';
    req.on('data', (chunk) => (bodyRaw += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyRaw);
        const updated = mcDb.saveProjectSetting(projectName, {
          isFavorite: payload.isFavorite,
          isHidden: payload.isHidden,
          alias: payload.alias,
        });

        tasks.logAudit({
          eventType: 'PROJECT_SETTINGS_UPDATED',
          entityType: 'PROJECT',
          entityId: projectName,
          project: projectName,
          description: `Configuración actualizada para [${projectName}]: fav=${updated.isFavorite}, hidden=${updated.isHidden}`,
        });

        broadcastSse('project-settings-updated', { project: projectName, setting: updated });
        return sendJson(res, { success: true, setting: updated });
      } catch (err: any) {
        return sendJson(res, { error: err?.message || 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // Tasks: List
  if (url.pathname === '/api/radar/tasks' && method === 'GET') {
    const project = url.searchParams.get('project') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const priority = url.searchParams.get('priority') || 'all';
    const search = url.searchParams.get('search') || '';
    const originSessionId = url.searchParams.get('originSessionId') || undefined;

    const list = tasks.getTasks({ project, status, priority, search, originSessionId, includeNotes: true });
    return sendJson(res, { success: true, tasks: list, count: list.length });
  }

  // Tasks: Create (supports originSessionId)
  if (url.pathname === '/api/radar/tasks' && method === 'POST') {
    let bodyRaw = '';
    req.on('data', (chunk) => (bodyRaw += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyRaw);
        if (!payload.title || !payload.project) {
          return sendJson(res, { error: 'title and project are required' }, 400);
        }
        const created = tasks.createTask({
          project: payload.project,
          title: payload.title,
          description: payload.description || '',
          category: payload.category || 'FEATURE',
          priority: payload.priority || 'MEDIUM',
          status: payload.status || 'PENDING',
          dueDate: payload.dueDate || undefined,
          originSessionId: payload.originSessionId || undefined,
          tags: Array.isArray(payload.tags) ? payload.tags : [],
        });

        broadcastSse('task-created', { task: created });
        return sendJson(res, { success: true, task: created }, 201);
      } catch (err: any) {
        return sendJson(res, { error: err?.message || 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // Tasks: Add note
  if (url.pathname.match(/^\/api\/radar\/tasks\/[^/]+\/notes$/) && method === 'POST') {
    const taskId = url.pathname.split('/')[4];
    let bodyRaw = '';
    req.on('data', (chunk) => (bodyRaw += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyRaw);
        if (!payload.content || !payload.content.trim()) {
          return sendJson(res, { error: 'content is required' }, 400);
        }
        const note = tasks.addNote(taskId, {
          author: payload.author || 'j0k3r',
          content: payload.content.trim(),
        });
        if (!note) {
          return sendJson(res, { error: 'Task not found' }, 404);
        }

        broadcastSse('task-note-added', { taskId, note });
        return sendJson(res, { success: true, note }, 201);
      } catch (err: any) {
        return sendJson(res, { error: err?.message || 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // Tasks: Update
  if (url.pathname.startsWith('/api/radar/tasks/') && method === 'PATCH') {
    const id = url.pathname.replace('/api/radar/tasks/', '');
    let bodyRaw = '';
    req.on('data', (chunk) => (bodyRaw += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyRaw);
        const updated = tasks.updateTask(id, payload);
        if (!updated) {
          return sendJson(res, { error: 'Task not found' }, 404);
        }

        broadcastSse('task-updated', { task: updated });
        return sendJson(res, { success: true, task: updated });
      } catch (err: any) {
        return sendJson(res, { error: err?.message || 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // Audit Log
  if (url.pathname === '/api/radar/audit' && method === 'GET') {
    const project = url.searchParams.get('project') || 'all';
    const limit = Number(url.searchParams.get('limit') || 50);
    const entries = tasks.getAuditLog({ project, limit });
    return sendJson(res, { success: true, audit: entries });
  }

  // Engram: Observations
  if (url.pathname === '/api/engram/observations') {
    const project = url.searchParams.get('project') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const limit = Number(url.searchParams.get('limit') || 60);

    const items = engram.getObservations({ project, type, search, limit });
    return sendJson(res, { success: true, observations: items, count: items.length });
  }

  // Engram: Sessions
  if (url.pathname === '/api/engram/sessions') {
    const project = url.searchParams.get('project') || undefined;
    const limit = Number(url.searchParams.get('limit') || 30);
    const sessions = engram.getSessions({ project, limit });
    return sendJson(res, { success: true, sessions, count: sessions.length });
  }

  // Engram: Session Briefing & Full Expediente
  if (url.pathname.startsWith('/api/engram/sessions/') && url.pathname.endsWith('/briefing') && method === 'GET') {
    const sessionId = decodeURIComponent(url.pathname.replace('/api/engram/sessions/', '').replace('/briefing', ''));
    const briefing = engram.getSessionBriefing(sessionId);
    
    // Handle error cases from enhanced getSessionBriefing
    if (briefing.meta?.isError) {
      // Log audit event for Engram session briefing error
      tasks.logAudit({
        eventType: 'SESSION_BRIEFING_ERROR',
        entityType: 'ENGRAM',
        entityId: sessionId,
        project: briefing.session.project || 'unknown',
        description: `Error loading session briefing for ${sessionId}: ${briefing.meta?.errorMessage || 'Unknown error'}`
      });
      
      return sendJson(res, { 
        error: 'Failed to load session briefing', 
        details: briefing.meta?.errorMessage || 'Unknown error' 
      }, 500);
    }

    // Attach related tasks from mission control database
    briefing.relatedTasks = tasks.getTasksBySession(sessionId);
    return sendJson(res, { success: true, briefing });
  }

  // Engram: User Prompts
  if (url.pathname === '/api/engram/prompts') {
    const project = url.searchParams.get('project') || undefined;
    const limit = Number(url.searchParams.get('limit') || 40);
    const prompts = engram.getRecentPrompts({ project, limit });
    return sendJson(res, { success: true, prompts, count: prompts.length });
  }

  // Engram: Cloud status
  if (url.pathname === '/api/engram/cloud/status') {
    const status = engram.getCloudSyncStatus();
    return sendJson(res, { success: true, cloud: status });
  }

  // --- Terminales & Sesiones (Herdr, Warp, Orca) ---
  if (url.pathname === '/api/terminals/status' && method === 'GET') {
    try {
      const runtimes = await terminals.getRuntimeStatuses();
      return sendJson(res, { success: true, runtimes });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching terminal runtimes' }, 500);
    }
  }

  if (url.pathname === '/api/terminals/sessions' && method === 'GET') {
    try {
      const data = await terminals.getDashboardData();
      return sendJson(res, data);
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching terminal sessions' }, 500);
    }
  }

  if (url.pathname === '/api/terminals/herdr/focus' && method === 'POST') {
    let bodyRaw = '';
    req.on('data', (chunk) => (bodyRaw += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyRaw);
        if (!payload.paneId) {
          return sendJson(res, { error: 'paneId is required' }, 400);
        }
        const ok = await terminals.focusHerdrPane(payload.paneId);
        tasks.logAudit({
          eventType: 'TASK_STATUS_CHANGED',
          entityType: 'TASK',
          entityId: payload.paneId,
          project: payload.project || 'herdr',
          description: `Panel de Herdr enfocado: ${payload.paneId}`,
        });
        return sendJson(res, { success: ok, paneId: payload.paneId });
      } catch (err: any) {
        return sendJson(res, { error: err?.message || 'Invalid JSON' }, 400);
      }
    });
    return;
  }

  // --- CPAMC (AI Gateway & Auto-Switcher) Endpoints ---
  if (url.pathname === '/api/cpamc/status' && method === 'GET') {
    try {
      const force = url.searchParams.get('force') === 'true';
      const statusData = await cpamc.getStatus(force);
      return sendJson(res, statusData);
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching CPAMC status' }, 500);
    }
  }

  if (url.pathname === '/api/cpamc/check' && method === 'POST') {
    try {
      const checkResult = await cpamc.triggerCheck();
      const freshStatus = await cpamc.getStatus(true);
      broadcastSse('cpamc-updated', freshStatus);
      return sendJson(res, { success: checkResult.success, output: checkResult.output, status: freshStatus });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error executing CPAMC check' }, 500);
    }
  }

  // --- SIO Telemetría (Ego Engine & Token Analytics) Endpoints ---
  if (url.pathname === '/api/telemetry/stats' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const force = url.searchParams.get('force') === 'true';
      const stats = await telemetry.getStats(range, force);
      return sendJson(res, { success: true, range, stats });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching telemetry stats' }, 500);
    }
  }

  if (url.pathname === '/api/telemetry/accounts' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const force = url.searchParams.get('force') === 'true';
      const accounts = await telemetry.getAccounts(range, force);
      return sendJson(res, { success: true, range, accounts });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching telemetry accounts' }, 500);
    }
  }

  if (url.pathname === '/api/telemetry/models' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const force = url.searchParams.get('force') === 'true';
      const models = await telemetry.getModels(range, force);
      return sendJson(res, { success: true, range, models });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching telemetry models' }, 500);
    }
  }

  if (url.pathname === '/api/telemetry/timeline' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const force = url.searchParams.get('force') === 'true';
      const timeline = await telemetry.getTimeline(range, force);
      return sendJson(res, { success: true, range, timeline });
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching telemetry timeline' }, 500);
    }
  }

  if (url.pathname === '/api/telemetry/snapshot' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const force = url.searchParams.get('force') === 'true';
      const snapshot = await telemetry.getSnapshot(range, force);
      return sendJson(res, snapshot);
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error fetching telemetry snapshot' }, 500);
    }
  }

  if (url.pathname === '/api/telemetry/export' && method === 'GET') {
    try {
      const range = url.searchParams.get('range') || '24h';
      const snapshot = await telemetry.getSnapshot(range, true);
      const filename = `sio-telemetry-${range}-${new Date().toISOString().slice(0, 10)}.json`;
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      return res.end(JSON.stringify(snapshot, null, 2));
    } catch (err: any) {
      return sendJson(res, { error: err?.message || 'Error exporting telemetry snapshot' }, 500);
    }
  }

  // --- Serve Frontend Static App ---
  let filePath = path.join(process.cwd(), 'public', url.pathname === '/' ? 'index.html' : url.pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback to index.html for SPA
  const indexPath = path.join(process.cwd(), 'public/index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=======================================================`);
  console.log(`🚀 SIO MISSION CONTROL & ENGINEERING COCKPIT 2026`);
  console.log(`🌐 Local URL:     http://localhost:${PORT}`);
  console.log(`📡 Network URL:   http://0.0.0.0:${PORT}`);
  console.log(`💾 Tasks SQLite:  data/mission-control.db (Native WAL)`);
  console.log(`🧠 Engram SQLite: /home/wilox/.engram/engram.db (Read-Only)`);
  console.log(`⚡ SSE Streaming: /api/stream (Live heartbeats & watchers)`);
  console.log(`=======================================================\n`);
});
