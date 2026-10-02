import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EngramService } from '../src/engram-service.ts';
import { TasksService } from '../src/tasks-service.ts';
import { GitService } from '../src/git-service.ts';
import { MissionControlDb } from '../src/db.ts';
import path from 'node:path';
import fs from 'node:fs';

describe('Center Control Manager Core Unit Tests', () => {
  it('1. EngramService connects, queries observations with FTS5, and parses session briefing', () => {
    const engram = new EngramService();
    const stats = engram.getProjectStats();
    assert.ok(typeof stats === 'object');

    const observations = engram.getObservations({ limit: 10 });
    assert.ok(Array.isArray(observations));

    const sessions = engram.getSessions({ limit: 5 });
    assert.ok(Array.isArray(sessions));

    if (sessions.length > 0) {
      // Test getSessionBriefing on the first available session
      const firstSession = sessions[0];
      const briefing = engram.getSessionBriefing(firstSession.id);
      assert.ok(briefing);
      assert.strictEqual(briefing?.session.id, firstSession.id);
      assert.ok(Array.isArray(briefing?.prompts));
      assert.ok(Array.isArray(briefing?.observations));
      assert.ok(typeof briefing?.parsedSummary === 'object');
      assert.ok(Array.isArray(briefing?.parsedSummary.accomplished));
      assert.ok(Array.isArray(briefing?.parsedSummary.nextSteps));
    }
  });

  it('2. TasksService manages pending tasks, due dates, originSessionId, notes, and audit log', () => {
    const tempDbPath = path.resolve(process.cwd(), 'data/test-mission-control.db');
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);

    const mcDb = new MissionControlDb(tempDbPath);
    const tasks = new TasksService(mcDb.getDb());

    // Create task with dueDate and originSessionId
    const created = tasks.createTask({
      project: 'sio-hotel',
      title: 'Validación de Arquitectura 2026',
      description: 'Verificar ciclo completo con notas y auditoría',
      category: 'FEATURE',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: '2026-10-01',
      originSessionId: 'sess-unit-test-123',
      tags: ['test', 'architecture'],
    });

    assert.ok(created.id);
    assert.strictEqual(created.title, 'Validación de Arquitectura 2026');
    assert.strictEqual(created.dueDate, '2026-10-01');
    assert.strictEqual(created.originSessionId, 'sess-unit-test-123');

    // Query tasks by session
    const bySession = tasks.getTasksBySession('sess-unit-test-123');
    assert.strictEqual(bySession.length, 1);
    assert.strictEqual(bySession[0].id, created.id);

    // Add note
    const note = tasks.addNote(created.id, {
      author: 'user',
      content: 'Primera nota de avance técnico.',
    });
    assert.ok(note?.id);
    assert.strictEqual(note?.content, 'Primera nota de avance técnico.');

    // Update status
    const updated = tasks.updateTaskStatus(created.id, 'COMPLETED');
    assert.strictEqual(updated?.status, 'COMPLETED');
    assert.ok(updated?.completedAt);

    // Verify task with notes
    const fetched = tasks.getTaskById(created.id);
    assert.strictEqual(fetched?.notes?.length, 1);
    assert.strictEqual(fetched?.notes?.[0].content, 'Primera nota de avance técnico.');

    // Verify audit log
    const audit = tasks.getAuditLog({ limit: 10 });
    assert.ok(audit.length >= 3); // CREATED, NOTE_ADDED, STATUS_CHANGED

    // Test project settings persistence
    mcDb.saveProjectSetting('sio-hotel', { isFavorite: true, alias: 'SIO Hotel PMS' });
    const settings = mcDb.getProjectSettings();
    assert.strictEqual(settings.get('sio-hotel')?.isFavorite, true);
    assert.strictEqual(settings.get('sio-hotel')?.alias, 'SIO Hotel PMS');

    // Cleanup
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('3. GitService auto-discovers projects and extracts branch/clean state', () => {
    const discovered = GitService.discoverProjects();
    assert.ok(Array.isArray(discovered));
    assert.ok(discovered.length > 0);

    const currentRepo = GitService.getRepoInfo(process.cwd());
    assert.strictEqual(currentRepo.isGit, true);
    assert.ok(currentRepo.branch);
  });
});
