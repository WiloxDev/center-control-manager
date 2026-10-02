import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TelemetryService } from '../src/telemetry-service.ts';

describe('TelemetryService — Ego Engine & Token Analytics', () => {
  const telemetry = new TelemetryService();

  it('1. Fetches high-level stats with default 24h range', async () => {
    const stats = await telemetry.getStats('24h');
    // If CPAMC gateway is reachable, verify stats fields
    if (stats) {
      assert.strictEqual(typeof stats.total_requests, 'number');
      assert.strictEqual(typeof stats.total_tokens, 'number');
      assert.strictEqual(typeof stats.prompt_tokens, 'number');
      assert.strictEqual(typeof stats.completion_tokens, 'number');
      assert.strictEqual(typeof stats.estimated_cost_usd, 'number');
      assert.strictEqual(typeof stats.success_rate, 'number');
      assert.ok(stats.total_requests >= 0);
    } else {
      // Gateway offline fallback
      assert.strictEqual(stats, null);
    }
  });

  it('2. Fetches account token breakdown and enriches known prefixes', async () => {
    const accounts = await telemetry.getAccounts('24h');
    assert.ok(Array.isArray(accounts));
    if (accounts.length > 0) {
      const first = accounts[0];
      assert.ok(first.account);
      assert.strictEqual(typeof first.total_tokens, 'number');
      assert.strictEqual(typeof first.total_requests, 'number');
      assert.ok(first.cleanName);
    }
  });

  it('3. Fetches model usage breakdown', async () => {
    const models = await telemetry.getModels('24h');
    assert.ok(Array.isArray(models));
    if (models.length > 0) {
      const first = models[0];
      assert.ok(first.model);
      assert.strictEqual(typeof first.total_tokens, 'number');
      assert.strictEqual(typeof first.estimated_cost_usd, 'number');
    }
  });

  it('4. Generates complete consolidated snapshot for export', async () => {
    const snapshot = await telemetry.getSnapshot('24h');
    assert.strictEqual(snapshot.success, true);
    assert.strictEqual(snapshot.range, '24h');
    assert.ok(snapshot.timestamp);
    assert.ok(Array.isArray(snapshot.accounts));
    assert.ok(Array.isArray(snapshot.models));
    assert.ok(Array.isArray(snapshot.timeline));
  });
});
