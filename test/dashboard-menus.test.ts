import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { server } from '../src/server.ts';

describe('Dashboard Menus & API Integration TDD', () => {
  let baseUrl = '';
  let serverInstance: http.Server;

  before(async () => {
    await new Promise<void>((resolve) => {
      serverInstance = server.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    serverInstance.closeAllConnections();
    await new Promise<void>((resolve) => {
      serverInstance.close(() => resolve());
    });
  });

  // Helper for JSON requests
  async function api(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
    const url = `${baseUrl}${path}`;
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      ...options.headers,
    };
    let bodyStr: string | undefined;

    if (options.body) {
      bodyStr = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, headers: res.headers, data };
  }

  // --- 1. MENÚ: OVERVIEW / PANORAMA ---
  describe('Menu 1: Overview & System Health', () => {
    it('GET /api/health returns system health and version metadata', async () => {
      const res = await api('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'UP');
      assert.strictEqual(typeof res.data.uptime, 'number');
      assert.ok(res.data.timestamp);
    });

    it('GET /api/projects returns portfolio summary and cloud enrollment', async () => {
      const res = await api('/api/projects');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.projects));
      assert.ok(typeof res.data.cloudStatus === 'object');
    });
  });

  // --- 2. MENÚ: PULSE / PULSO DE ACTIVIDAD ---
  describe('Menu 2: Activity Pulse & Sessions Expediente', () => {
    it('GET /api/engram/sessions returns session history list', async () => {
      const res = await api('/api/engram/sessions?limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.sessions));
    });

    it('GET /api/engram/prompts returns user prompt timeline', async () => {
      const res = await api('/api/engram/prompts?limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.prompts));
    });

    it('GET /api/engram/sessions/:id/briefing handles session briefing contract', async () => {
      // Test structured error response for nonexistent session
      const res = await api('/api/engram/sessions/non-existent-session-xyz/briefing');
      assert.ok([200, 500].includes(res.status));
      if (res.status === 200) {
        assert.ok(res.data.briefing);
      } else {
        assert.ok(res.data.error);
      }
    });
  });

  // --- 3. MENÚ: RADAR DE PENDIENTES ---
  describe('Menu 3: Action Radar & Task Lifecycle', () => {
    let createdTaskId = '';

    it('POST /api/radar/tasks creates a new standardized task', async () => {
      const payload = {
        project: 'center-control-manager',
        title: 'TDD Automation & Commercial Packaging',
        description: 'Verify complete task lifecycle under TDD with sanitized author',
        category: 'FEATURE',
        priority: 'HIGH',
        status: 'PENDING',
        tags: ['tdd', 'standardization'],
      };

      const res = await api('/api/radar/tasks', { method: 'POST', body: payload });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.task.id);
      assert.strictEqual(res.data.task.title, payload.title);
      assert.strictEqual(res.data.task.project, payload.project);
      assert.strictEqual(res.data.task.status, 'PENDING');
      createdTaskId = res.data.task.id;
    });

    it('GET /api/radar/tasks retrieves tasks with filters', async () => {
      const res = await api('/api/radar/tasks?project=center-control-manager&status=PENDING');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.tasks));
      const found = res.data.tasks.find((t: any) => t.id === createdTaskId);
      assert.ok(found, 'Created task must be found in task list');
    });

    it('POST /api/radar/tasks/:id/notes adds an authorized note with clean author', async () => {
      const notePayload = {
        author: 'developer',
        content: 'TDD verification step passing cleanly.',
      };

      const res = await api(`/api/radar/tasks/${createdTaskId}/notes`, { method: 'POST', body: notePayload });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.note.id);
      assert.strictEqual(res.data.note.author, 'developer');
      assert.strictEqual(res.data.note.content, notePayload.content);
    });

    it('PATCH /api/radar/tasks/:id transitions task status to COMPLETED', async () => {
      const res = await api(`/api/radar/tasks/${createdTaskId}`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.task.status, 'COMPLETED');
      assert.ok(res.data.task.completedAt);
    });

    it('GET /api/radar/audit verifies audit trail logging', async () => {
      const res = await api('/api/radar/audit?limit=10');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.audit));
      assert.ok(res.data.audit.length > 0);
    });
  });

  // --- 4. MENÚ: KNOWLEDGE / DECISIONES ADR ---
  describe('Menu 4: Knowledge Base & ADR Observations', () => {
    it('GET /api/engram/observations returns observations list with pagination', async () => {
      const res = await api('/api/engram/observations?limit=10');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.observations));
      assert.strictEqual(typeof res.data.count, 'number');
    });

    it('GET /api/engram/observations?type=decision filters by architectural decision', async () => {
      const res = await api('/api/engram/observations?type=decision&limit=10');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.observations));
      for (const obs of res.data.observations) {
        assert.ok(
          ['decision', 'architecture', 'architectural_decision', 'architecture_decision'].includes(obs.type)
        );
      }
    });

    it('GET /api/engram/observations?search=... performs FTS5 or fallback keyword search', async () => {
      const res = await api('/api/engram/observations?search=api&limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.observations));
    });
  });

  // --- 5. MENÚ: PORTFOLIO & GIT STATUS ---
  describe('Menu 5: Portfolio & Project Settings', () => {
    it('PATCH /api/projects/:project/settings updates and persists project metadata', async () => {
      const testProject = 'center-control-manager';
      const settingsPayload = {
        isFavorite: true,
        alias: 'Engineering Cockpit Standard',
        isHidden: false,
      };

      const res = await api(`/api/projects/${testProject}/settings`, {
        method: 'PATCH',
        body: settingsPayload,
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.setting.project, testProject);
      assert.strictEqual(res.data.setting.isFavorite, true);
      assert.strictEqual(res.data.setting.alias, 'Engineering Cockpit Standard');
    });
  });

  // --- 6. MENÚ: CLOUD SYNC ---
  describe('Menu 6: Cloud Sync Status', () => {
    it('GET /api/engram/cloud/status returns cloud state schema', async () => {
      const res = await api('/api/engram/cloud/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(typeof res.data.cloud === 'object');
      assert.strictEqual(typeof res.data.cloud.configured, 'boolean');
      assert.strictEqual(typeof res.data.cloud.pendingMutations, 'number');
      assert.ok(Array.isArray(res.data.cloud.enrolledProjects));
    });
  });

  // --- 7. MENÚ: TERMINALES & SESIONES (GENTLE-PI & HERDR) ---
  describe('Menu 7: Terminals & Coding Agent Sessions', () => {
    it('GET /api/terminals/status returns multi-terminal runtimes', async () => {
      const res = await api('/api/terminals/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.runtimes));
      const herdr = res.data.runtimes.find((r: any) => r.runtime === 'herdr');
      assert.ok(herdr, 'Herdr runtime must be reported');
    });

    it('GET /api/terminals/sessions returns sessions mapped to gentle-pi or pi', async () => {
      const res = await api('/api/terminals/sessions');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.sessions));
      for (const s of res.data.sessions) {
        assert.ok(['gentle-pi', 'gentle-ai', 'pi', 'shell', 'other'].includes(s.harness.type));
      }
    });

    it('POST /api/terminals/herdr/focus validates pane focus payload', async () => {
      const res = await api('/api/terminals/herdr/focus', {
        method: 'POST',
        body: { paneId: 'test-pane-1', project: 'center-control-manager' },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.paneId, 'test-pane-1');
      assert.strictEqual(typeof res.data.success, 'boolean');
    });
  });

  // --- 8. MENÚ: CPAMC MODEL POOLS ---
  describe('Menu 8: AI Model Pools & Health', () => {
    it('GET /api/cpamc/status returns pools structure with clean sanitized data', async () => {
      const res = await api('/api/cpamc/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.data.success, 'boolean');
      assert.ok(Array.isArray(res.data.pools));
      assert.ok(Array.isArray(res.data.specialists));

      // Privacy check: Ensure no personal emails leaked
      const raw = JSON.stringify(res.data);
      assert.ok(!raw.includes('wilsonlavio'), 'Must not leak personal emails in CPAMC status');
      assert.ok(!raw.includes('maribelluz'), 'Must not leak personal emails in CPAMC status');
      assert.ok(!raw.includes('infosoytec'), 'Must not leak personal emails in CPAMC status');
    });

    it('POST /api/cpamc/check returns health execution report', async () => {
      const res = await api('/api/cpamc/check', { method: 'POST' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.data.success, 'boolean');
      assert.ok(res.data.status);
    });
  });

  // --- 9. MENÚ: TELEMETRÍA & TOKEN AUDIT ---
  describe('Menu 9: Token Analytics & Telemetry', () => {
    it('GET /api/telemetry/stats retrieves high-level consumption stats', async () => {
      const res = await api('/api/telemetry/stats?range=24h');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.range, '24h');
    });

    it('GET /api/telemetry/accounts retrieves sanitized account breakdowns', async () => {
      const res = await api('/api/telemetry/accounts?range=24h');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.accounts));

      const raw = JSON.stringify(res.data);
      assert.ok(!raw.includes('wilsonlavio'), 'Must not leak personal emails in telemetry accounts');
      assert.ok(!raw.includes('maribelluz'), 'Must not leak personal emails in telemetry accounts');
    });

    it('GET /api/telemetry/models retrieves model usage breakdown', async () => {
      const res = await api('/api/telemetry/models?range=24h');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.models));
    });

    it('GET /api/telemetry/snapshot returns consolidated snapshot', async () => {
      const res = await api('/api/telemetry/snapshot?range=24h');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.timestamp);
      assert.ok(Array.isArray(res.data.accounts));
      assert.ok(Array.isArray(res.data.models));
      assert.ok(Array.isArray(res.data.timeline));
    });

    it('GET /api/telemetry/export streams downloadable attachment headers', async () => {
      const res = await api('/api/telemetry/export?range=24h');
      assert.strictEqual(res.status, 200);
      const disposition = res.headers.get('content-disposition') || '';
      assert.ok(disposition.includes('attachment; filename='));
      assert.ok(disposition.includes('.json'));
    });
  });

  // --- 10. TIEMPO REAL: SSE STREAM CHANNEL ---
  describe('Real-Time Live Updates (SSE Stream)', () => {
    it('GET /api/stream establishes event-stream connection', async () => {
      const controller = new AbortController();

      try {
        const res = await fetch(`${baseUrl}/api/stream`, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('content-type'), 'text/event-stream');
        
        // Read one chunk to confirm stream, then close
        const reader = res.body?.getReader();
        if (reader) {
          await reader.read();
          await reader.cancel();
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          throw err;
        }
      } finally {
        controller.abort();
      }
    });
  });

  // --- 11. TDD VISTAS GRÁFICAS DEL DASHBOARD (VISUAL VIEWS CONTRACT) ---
  describe('Visual Views Contract: Recreated Dashboard Views', () => {
    // Vista 1: Radar Kanban Columns & Priority Sorting
    it('Vista 1 (Radar Kanban): Categorizes tasks into PENDING, IN_PROGRESS and COMPLETED with priority order', async () => {
      const proj = 'kanban-test-project';
      
      // Create tasks for each column
      const t1 = await api('/api/radar/tasks', {
        method: 'POST',
        body: { project: proj, title: 'Tarea Pendiente Alta', priority: 'HIGH', status: 'PENDING', tags: ['sql', 'perf'] },
      });
      const t2 = await api('/api/radar/tasks', {
        method: 'POST',
        body: { project: proj, title: 'Tarea En Progreso Media', priority: 'MEDIUM', status: 'IN_PROGRESS', tags: ['refactor'] },
      });
      const t3 = await api('/api/radar/tasks', {
        method: 'POST',
        body: { project: proj, title: 'Tarea Completada Baja', priority: 'LOW', status: 'COMPLETED', tags: ['docs'] },
      });

      assert.strictEqual(t1.status, 201);
      assert.strictEqual(t2.status, 201);
      assert.strictEqual(t3.status, 201);

      // Fetch all tasks for this project
      const res = await api(`/api/radar/tasks?project=${proj}`);
      assert.strictEqual(res.status, 200);
      const allTasks = res.data.tasks;

      // Group into Kanban columns as the UI does
      const pendingCol = allTasks.filter((t: any) => t.status === 'PENDING');
      const inProgressCol = allTasks.filter((t: any) => t.status === 'IN_PROGRESS');
      const completedCol = allTasks.filter((t: any) => t.status === 'COMPLETED');

      assert.ok(pendingCol.length >= 1, 'Pending column must have at least 1 task');
      assert.ok(inProgressCol.length >= 1, 'In-Progress column must have at least 1 task');
      assert.ok(completedCol.length >= 1, 'Completed column must have at least 1 task');

      // Verify card payload completeness for Kanban card rendering
      const card = pendingCol[0];
      assert.ok(card.id);
      assert.strictEqual(card.project, proj);
      assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(card.priority));
      assert.ok(Array.isArray(card.tags));
      assert.ok(Array.isArray(card.notes));
    });

    // Vista 2: Terminales & Coding Agents Cockpit
    it('Vista 2 (Terminales Live Cockpit): Validates agent card schema with gentle-pi support', async () => {
      const res = await api('/api/terminals/sessions');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.sessions));

      for (const sess of res.data.sessions) {
        // Required fields for the terminal session card
        assert.ok(sess.id, 'Session must have an ID');
        assert.ok(sess.runtime, 'Session must have a runtime');
        assert.ok(sess.project, 'Session must have a project name');
        assert.ok(sess.projectPath, 'Session must have a project path');
        assert.strictEqual(typeof sess.isGit, 'boolean');
        assert.ok(sess.harness, 'Session must have harness info');

        // Verify gentle-pi compatibility and absence of j0k3r-pi
        assert.notStrictEqual(sess.harness.type, 'j0k3r-pi', 'Harness must never be j0k3r-pi');
        assert.ok(
          ['gentle-pi', 'gentle-ai', 'pi', 'shell', 'other'].includes(sess.harness.type),
          `Harness type ${sess.harness.type} must be a supported type`
        );
        assert.ok(
          ['working', 'blocked', 'idle', 'unknown'].includes(sess.harness.status),
          `Status ${sess.harness.status} must be valid agent status`
        );
      }
    });

    // Vista 3: Pulso de Actividad & Expedientes Briefing
    it('Vista 3 (Pulso & Expediente): Validates parsed briefing structure and originSessionId linking', async () => {
      const sessionsRes = await api('/api/engram/sessions?limit=1');
      assert.strictEqual(sessionsRes.status, 200);

      if (sessionsRes.data.sessions && sessionsRes.data.sessions.length > 0) {
        const testSession = sessionsRes.data.sessions[0];
        const briefingRes = await api(`/api/engram/sessions/${testSession.id}/briefing`);
        
        if (briefingRes.status === 200 && briefingRes.data.briefing) {
          const briefing = briefingRes.data.briefing;
          assert.strictEqual(briefing.session.id, testSession.id);
          assert.ok(briefing.parsedSummary, 'Briefing must have parsedSummary');
          assert.ok(Array.isArray(briefing.parsedSummary.discoveries));
          assert.ok(Array.isArray(briefing.parsedSummary.accomplished));
          assert.ok(Array.isArray(briefing.parsedSummary.keyDecisions));
          assert.ok(Array.isArray(briefing.parsedSummary.nextSteps));
          assert.ok(Array.isArray(briefing.parsedSummary.relevantFiles));
        }

        // Test linking a task to this session (originSessionId)
        const linkedTask = await api('/api/radar/tasks', {
          method: 'POST',
          body: {
            project: testSession.project || 'briefing-test',
            title: 'Tarea derivada de expediente',
            originSessionId: testSession.id,
          },
        });
        assert.strictEqual(linkedTask.status, 201);
        assert.strictEqual(linkedTask.data.task.originSessionId, testSession.id);

        // Fetch tasks filtered by originSessionId
        const fetchedLinked = await api(`/api/radar/tasks?originSessionId=${testSession.id}`);
        assert.strictEqual(fetchedLinked.status, 200);
        const match = fetchedLinked.data.tasks.find((t: any) => t.id === linkedTask.data.task.id);
        assert.ok(match, 'Linked task must be retrieved by originSessionId filter');
      }
    });

    // Vista 4: Conocimiento & Decisiones ADR
    it('Vista 4 (Conocimiento ADR): Returns observations card structure and decision filtering', async () => {
      const res = await api('/api/engram/observations?limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.observations));

      if (res.data.observations.length > 0) {
        const obs = res.data.observations[0];
        // Required fields for rendering an ADR card in the UI
        assert.ok(obs.id);
        assert.ok(obs.type);
        assert.ok(obs.title);
        assert.ok(obs.content);
        assert.ok(obs.project);
        assert.ok(obs.createdAt);
      }
    });

    // Vista 5: Salud del Portafolio & Git
    it('Vista 5 (Portafolio & Git Health): Sorts favorite projects first and updates settings', async () => {
      const initialProjects = await api('/api/projects');
      assert.strictEqual(initialProjects.status, 200);
      assert.ok(Array.isArray(initialProjects.data.projects));

      if (initialProjects.data.projects.length > 0) {
        const firstProj = initialProjects.data.projects[0].name;

        // Mark as favorite with custom alias
        const patchRes = await api(`/api/projects/${firstProj}/settings`, {
          method: 'PATCH',
          body: { isFavorite: true, alias: '⭐ Proyecto Destacado' },
        });
        assert.strictEqual(patchRes.status, 200);
        assert.strictEqual(patchRes.data.setting.isFavorite, true);
        assert.strictEqual(patchRes.data.setting.alias, '⭐ Proyecto Destacado');

        // Re-fetch projects to ensure sorting puts favorite at top
        const updatedProjects = await api('/api/projects');
        assert.strictEqual(updatedProjects.status, 200);
        const topProject = updatedProjects.data.projects[0];
        assert.strictEqual(topProject.isFavorite, true, 'Top project in portfolio must be marked as favorite');
      }
    });

    // Vista 6: Frontend SPA Serving
    it('Vista 6 (SPA Delivery): Serves index.html with Center Control Manager branding', async () => {
      const res = await api('/');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.data, 'string');
      assert.ok(res.data.includes('Center Control Manager'), 'Served HTML must contain Center Control Manager title');
      assert.ok(res.data.includes('id="app"'), 'Served HTML must contain Vue root mount element');
    });
  });
});
