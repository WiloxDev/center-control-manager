import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {
  TelemetryStats,
  TelemetryAccountItem,
  TelemetryModelItem,
  TelemetryTimelineItem,
  TelemetrySnapshot,
} from './types.ts';

const DEFAULT_BASE_URL = process.env.EGO_PROXY_URL || 'http://127.0.0.1:8317';
const KEY_PATH = process.env.CLIPROXY_KEY_PATH || path.join(os.homedir(), '.cliproxy_management_key');

export class TelemetryService {
  private baseUrl: string;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly CACHE_TTL_MS = 15_000; // 15 segundos

  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getManagementKey(): string {
    try {
      if (fs.existsSync(KEY_PATH)) {
        return fs.readFileSync(KEY_PATH, 'utf8').trim();
      }
    } catch {
      // fallback
    }
    return '';
  }

  private async fetchEgo<T>(endpoint: string): Promise<T | null> {
    const key = this.getManagementKey();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const res = await fetch(url, {
        headers: {
          'X-Management-Key': key,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        console.warn(`[TelemetryService] HTTP ${res.status} fetching ${endpoint}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err: any) {
      console.warn(`[TelemetryService] Error fetching ${endpoint}:`, err?.message);
      return null;
    }
  }

  private enrichAccountItem(item: TelemetryAccountItem): TelemetryAccountItem {
    const acc = item.account || '';
    let prefix = '';
    let cleanName = acc;

    // Sanitize account string to prevent private emails/names from leaking
    const sanitizedAccount = acc
      .replace(/^([a-zA-Z0-9_\-\.]+)(@.+)$/, (_, u, d) => `${u.slice(0, 2)}***${d}`)
      .replace(/wilsonlavio\w*/gi, 'pool-account')
      .replace(/maribelluz\w*/gi, 'pool-account')
      .replace(/infosoytec/gi, 'pool-account');

    // Detect standard model family prefixes and labels
    if (acc.includes('agy_son') || acc.includes('son-') || acc.includes('sonnet')) {
      prefix = 'agy_son';
      cleanName = '🟣 Sonnet · Model Pool';
    } else if (acc.includes('agy_g2') || acc.includes('g2-')) {
      prefix = 'agy_g2';
      cleanName = '🟢 Gemini 2 · Interactive';
    } else if (acc.includes('agy_g1') || acc.includes('g1-')) {
      prefix = 'agy_g1';
      cleanName = '🟢 Gemini 1 · Subagents';
    } else if (acc.includes('opencode') || acc.includes('ocgo')) {
      prefix = 'ocgo';
      cleanName = '🛡️ OpenCode Go (Salvavidas)';
    } else if (acc.includes('nvidia') || acc.includes('nv')) {
      prefix = 'nv';
      cleanName = '🚀 NVIDIA NIM (Especialista)';
    } else if (acc.startsWith('antigravity-')) {
      const email = acc.replace('antigravity-', '').replace('.json', '');
      const masked = email.replace(/^(.{2})[^@]+(@.+)$/, '$1***$2');
      cleanName = `📁 ${masked}`;
    }

    cleanName = cleanName
      .replace(/wilsonlavio\w*/gi, 'pool')
      .replace(/maribelluz\w*/gi, 'pool')
      .replace(/infosoytec/gi, 'pool');

    return {
      ...item,
      account: sanitizedAccount,
      prefix: prefix || undefined,
      cleanName,
    };
  }

  async getStats(range = '24h', force = false): Promise<TelemetryStats | null> {
    const cacheKey = `stats:${range}`;
    const now = Date.now();
    if (!force && this.cache.has(cacheKey) && this.cache.get(cacheKey)!.expiry > now) {
      return this.cache.get(cacheKey)!.data;
    }

    const data = await this.fetchEgo<TelemetryStats>(`/v0/management/ego/stats?range=${encodeURIComponent(range)}`);
    if (data) {
      this.cache.set(cacheKey, { data, expiry: now + this.CACHE_TTL_MS });
    }
    return data;
  }

  async getAccounts(range = '24h', force = false): Promise<TelemetryAccountItem[]> {
    const cacheKey = `accounts:${range}`;
    const now = Date.now();
    if (!force && this.cache.has(cacheKey) && this.cache.get(cacheKey)!.expiry > now) {
      return this.cache.get(cacheKey)!.data;
    }

    const data = await this.fetchEgo<TelemetryAccountItem[]>(`/v0/management/ego/accounts?range=${encodeURIComponent(range)}`);
    const enriched = (data || []).map((item) => this.enrichAccountItem(item));
    this.cache.set(cacheKey, { data: enriched, expiry: now + this.CACHE_TTL_MS });
    return enriched;
  }

  async getModels(range = '24h', force = false): Promise<TelemetryModelItem[]> {
    const cacheKey = `models:${range}`;
    const now = Date.now();
    if (!force && this.cache.has(cacheKey) && this.cache.get(cacheKey)!.expiry > now) {
      return this.cache.get(cacheKey)!.data;
    }

    const data = await this.fetchEgo<TelemetryModelItem[]>(`/v0/management/ego/models?range=${encodeURIComponent(range)}`);
    const list = data || [];
    this.cache.set(cacheKey, { data: list, expiry: now + this.CACHE_TTL_MS });
    return list;
  }

  async getTimeline(range = '24h', force = false): Promise<TelemetryTimelineItem[]> {
    const cacheKey = `timeline:${range}`;
    const now = Date.now();
    if (!force && this.cache.has(cacheKey) && this.cache.get(cacheKey)!.expiry > now) {
      return this.cache.get(cacheKey)!.data;
    }

    const data = await this.fetchEgo<TelemetryTimelineItem[]>(`/v0/management/ego/timeline?range=${encodeURIComponent(range)}`);
    const list = data || [];
    this.cache.set(cacheKey, { data: list, expiry: now + this.CACHE_TTL_MS });
    return list;
  }

  async getSnapshot(range = '24h', force = false): Promise<TelemetrySnapshot> {
    const [stats, accounts, models, timeline] = await Promise.all([
      this.getStats(range, force),
      this.getAccounts(range, force),
      this.getModels(range, force),
      this.getTimeline(range, force),
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      range,
      stats,
      accounts,
      models,
      timeline,
    };
  }
}
