import fs from 'node:fs';
import path from 'node:path';
import type {
  TelemetryStats,
  TelemetryAccountItem,
  TelemetryModelItem,
  TelemetryTimelineItem,
  TelemetrySnapshot,
} from './types.ts';

const DEFAULT_BASE_URL = 'http://192.168.10.150:8317';
const KEY_PATH = path.join(process.env.HOME || '/home/wilox', '.cliproxy_management_key');

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

    // Detectar prefijos canónicos y etiquetas de familia
    if (acc.includes('son-maribelluz') || acc === 'antigravity-son-maribelluz.json') {
      prefix = 'agy_son';
      cleanName = '🟣 Sonnet · Activa (maribelluz)';
    } else if (acc.includes('son-wilsonlavio11') || acc === 'antigravity-son-wilsonlavio11.json') {
      prefix = 'agy_son_1';
      cleanName = '💤 Sonnet · Reserva 1 (wilsonlavio11)';
    } else if (acc.includes('son-infosoytec') || acc.includes('agy_son_2')) {
      prefix = 'agy_son_2';
      cleanName = '💤 Sonnet · Reserva 2 (infosoytec)';
    } else if (acc.includes('son-wilsonlavio7') || acc.includes('agy_son_3')) {
      prefix = 'agy_son_3';
      cleanName = '💤 Sonnet · Reserva 3 (wilsonlavio7)';
    } else if (acc.includes('son-infowilsonlavio') || acc.includes('agy_son_4')) {
      prefix = 'agy_son_4';
      cleanName = '💤 Sonnet · Reserva 4 (infowilsonlavio)';
    } else if (acc.includes('son-wilsonlavio9') || acc.includes('agy_son_5')) {
      prefix = 'agy_son_5';
      cleanName = '💤 Sonnet · Reserva 5 (wilsonlavio9)';
    } else if (acc.includes('g2-infosoytec') || acc === 'antigravity-g2-infosoytec.json' || acc.includes('agy_g2')) {
      prefix = 'agy_g2';
      cleanName = '🟢 Gemini 2 · Chat (infosoytec)';
    } else if (acc.includes('g2-infowilsonlavio') || acc.includes('agy_g2_1')) {
      prefix = 'agy_g2_1';
      cleanName = '💤 Gemini 2 · Reserva 1 (infowilsonlavio)';
    } else if (acc.includes('g2-wilsonlavio9') || acc.includes('agy_g2_2')) {
      prefix = 'agy_g2_2';
      cleanName = '💤 Gemini 2 · Reserva 2 (wilsonlavio9)';
    } else if (acc.includes('g1-maribelluz') || acc === 'antigravity-g1-maribelluz.json' || acc.includes('agy_g1')) {
      prefix = 'agy_g1';
      cleanName = '🟢 Gemini 1 · Subagentes (maribelluz)';
    } else if (acc.includes('g1-wilsonlavio7') || acc.includes('agy_g1_1')) {
      prefix = 'agy_g1_1';
      cleanName = '💤 Gemini 1 · Reserva 1 (wilsonlavio7)';
    } else if (acc.includes('g1-wilsonlavio11') || acc.includes('agy_g1_2')) {
      prefix = 'agy_g1_2';
      cleanName = '💤 Gemini 1 · Reserva 2 (wilsonlavio11)';
    } else if (acc.includes('opencode')) {
      prefix = 'ocgo';
      cleanName = '🛡️ OpenCode Go (Salvavidas)';
    } else if (acc.includes('nvidia')) {
      prefix = 'nv';
      cleanName = '🚀 NVIDIA NIM (Especialista)';
    } else if (acc.startsWith('antigravity-')) {
      const email = acc.replace('antigravity-', '').replace('.json', '');
      cleanName = `📁 ${email} (Histórico)`;
    }

    return {
      ...item,
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
