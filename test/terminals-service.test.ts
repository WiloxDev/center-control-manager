import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TerminalsService } from '../src/terminals-service.ts';

describe('TerminalsService — Herdr & Project Sessions Detection', () => {
  const terminals = new TerminalsService();

  it('1. Detects Herdr runtime status (installed, running, socket)', async () => {
    const status = await terminals.getHerdrStatus();
    assert.strictEqual(status.runtime, 'herdr');
    assert.strictEqual(typeof status.installed, 'boolean');
    assert.strictEqual(typeof status.running, 'boolean');
    assert.ok(status.socketPath.includes('herdr.sock'));
  });

  it('2. Returns multi-terminal runtime statuses including stubs for Warp and Orca', async () => {
    const runtimes = await terminals.getRuntimeStatuses();
    assert.ok(Array.isArray(runtimes));
    assert.ok(runtimes.length >= 3);
    const herdr = runtimes.find((r) => r.runtime === 'herdr');
    const warp = runtimes.find((r) => r.runtime === 'warp');
    const orca = runtimes.find((r) => r.runtime === 'orca');
    assert.ok(herdr, 'Herdr runtime must be present');
    assert.ok(warp, 'Warp runtime must be present as foundation');
    assert.ok(orca, 'Orca runtime must be present as foundation');
  });

  it('3. Discovers active terminal sessions and maps cwd to projects catalog', async () => {
    const sessions = await terminals.getActiveSessions();
    assert.ok(Array.isArray(sessions));
    // If herdr or agent is running, verify session schema integrity
    for (const sess of sessions) {
      assert.ok(sess.id);
      assert.ok(sess.runtime);
      assert.ok(sess.title);
      assert.ok(sess.project);
      assert.ok(sess.projectPath);
      assert.strictEqual(typeof sess.isGit, 'boolean');
      assert.ok(sess.harness);
      assert.ok(['j0k3r-pi', 'gentle-pi', 'gentle-ai', 'pi', 'shell', 'other'].includes(sess.harness.type));
      assert.ok(['working', 'blocked', 'idle', 'unknown'].includes(sess.harness.status));
    }
  });
});
