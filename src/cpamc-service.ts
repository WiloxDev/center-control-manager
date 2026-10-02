import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CpamcAccountItem, CpamcPoolGroup, CpamcSpecialistItem, CpamcStatusResponse } from './types.ts';

const execFileAsync = promisify(execFile);

export class CpamcService {
  private cache: CpamcStatusResponse | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15_000; // 15s cache to avoid spamming quota endpoints

  /**
   * Obtiene el estado consolidado de los pools y especialistas de CPAMC
   */
  async getStatus(forceRefresh = false): Promise<CpamcStatusResponse> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      // 1. Ejecutar cpamc-auto-switcher -list
      const { stdout } = await execFileAsync('cpamc-auto-switcher', ['-list'], {
        timeout: 10_000,
        env: process.env,
      });

      const accounts = this.parseListOutput(stdout);
      const pools = this.buildPoolGroups(accounts);
      const specialists = this.getSpecialists();

      const response: CpamcStatusResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        pools,
        specialists,
        thresholds: {
          fiveHour: 90.0,
          weekly: 95.0,
        },
        autoSwitcherAvailable: true,
        rawListOutput: stdout,
      };

      this.cache = response;
      this.lastFetchTime = now;
      return response;
    } catch (err: any) {
      console.warn('[CPAMC Service Warning]: Error consultando cpamc-auto-switcher:', err?.message);

      // Fallback estático con la arquitectura homologada si el comando falla
      const fallbackPools: CpamcPoolGroup[] = [
        {
          profile: 'g1',
          name: 'Gemini 1 (Subagentes & Velocidad)',
          provider: 'antigravity',
          activePrefix: 'agy_g1',
          modelTarget: 'gemini-3.8-flash-high',
          status: 'HEALTHY',
          activeAccount: {
            id: 'pool-g1-primary@example.com',
            email: 'pool-g1-primary@example.com',
            prefix: 'agy_g1',
            status: 'ACTIVE',
            fiveHourConsumed: 28.0,
            weeklyConsumed: 63.0,
            minAvailable: 37.0,
          },
          reserves: [
            {
              id: 'pool-g1-reserve@example.com',
              email: 'pool-g1-reserve@example.com',
              prefix: 'agy_g1_1',
              status: 'RESERVE',
              fiveHourConsumed: 0.0,
              weeklyConsumed: 100.0,
              minAvailable: 0.0,
              resetDate: '2026-10-01',
            },
          ],
        },
        {
          profile: 'g2',
          name: 'Gemini 2 (Chat & Interactivo)',
          provider: 'antigravity',
          activePrefix: 'agy_g2',
          modelTarget: 'gemini-3.8-flash-high',
          status: 'WARNING',
          activeAccount: {
            id: 'pool-g2-primary@example.com',
            email: 'pool-g2-primary@example.com',
            prefix: 'agy_g2',
            status: 'ACTIVE',
            fiveHourConsumed: 74.0,
            weeklyConsumed: 94.8,
            minAvailable: 5.2,
          },
          reserves: [
            {
              id: 'pool-g2-reserve@example.com',
              email: 'pool-g2-reserve@example.com',
              prefix: 'agy_g2_1',
              status: 'RESERVE',
              fiveHourConsumed: 0.0,
              weeklyConsumed: 100.0,
              minAvailable: 0.0,
              resetDate: '2026-10-01',
            },
          ],
        },
        {
          profile: 'son',
          name: 'Sonnet (Arquitectura & Razonamiento)',
          provider: 'antigravity',
          activePrefix: 'agy_son',
          modelTarget: 'claude-sonnet-4-6',
          status: 'HEALTHY',
          activeAccount: {
            id: 'pool-son-primary@example.com',
            email: 'pool-son-primary@example.com',
            prefix: 'agy_son',
            status: 'ACTIVE',
            fiveHourConsumed: 0.0,
            weeklyConsumed: 29.2,
            minAvailable: 70.8,
          },
          reserves: [
            {
              id: 'pool-son-reserve@example.com',
              email: 'pool-son-reserve@example.com',
              prefix: 'agy_son_1',
              status: 'RESERVE',
              fiveHourConsumed: null,
              weeklyConsumed: 100.0,
              minAvailable: 0.0,
              resetDate: '2026-10-02',
            },
          ],
        },
      ];

      return {
        success: false,
        timestamp: new Date().toISOString(),
        pools: fallbackPools,
        specialists: this.getSpecialists(),
        thresholds: { fiveHour: 90.0, weekly: 95.0 },
        autoSwitcherAvailable: false,
      };
    }
  }

  /**
   * Ejecuta un chequeo forzado en segundo plano
   */
  async triggerCheck(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execFileAsync('cpamc-auto-switcher', ['-check', '-force', '-verbose'], {
        timeout: 15_000,
        env: process.env,
      });

      this.cache = null; // invalidar caché
      return {
        success: true,
        output: (stdout + '\n' + stderr).trim(),
      };
    } catch (err: any) {
      return {
        success: false,
        output: err?.message || 'Error ejecutando cpamc-auto-switcher',
      };
    }
  }

  private parseListOutput(stdout: string): (CpamcAccountItem & { profile: string })[] {
    const lines = stdout.split('\n');
    const items: (CpamcAccountItem & { profile: string })[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('STATUS') || line.startsWith('[INFO]')) continue;

      // Ejemplo: [ACTIVE]    antigravity   g1        mar...tro@gmail.com   agy_g1      27.6%         62.9%             37.1%
      const match = line.match(/^\[(ACTIVE|RESERVE)\]\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
      if (match) {
        const [, status, , profile, email, prefix, fiveH, weekly, minAvail] = match;

        const parsePct = (val: string): number | null => {
          if (!val || val === 'N/A') return null;
          const num = parseFloat(val.replace('%', ''));
          return Number.isFinite(num) ? num : null;
        };

        const item: CpamcAccountItem & { profile: string } = {
          id: email,
          email,
          prefix,
          profile,
          status: status as 'ACTIVE' | 'RESERVE',
          fiveHourConsumed: parsePct(fiveH),
          weeklyConsumed: parsePct(weekly),
          minAvailable: parsePct(minAvail),
        };

        // Si es reserva al 100%, estimar reset
        if (item.status === 'RESERVE' && item.weeklyConsumed !== null && item.weeklyConsumed >= 99.0) {
          if (profile === 'g1' || profile === 'g2') {
            item.resetDate = '01 de Octubre';
          } else if (profile === 'son') {
            item.resetDate = '02 de Octubre';
          }
        }

        items.push(item);
      }
    }

    return items;
  }

  private buildPoolGroups(accounts: (CpamcAccountItem & { profile: string })[]): CpamcPoolGroup[] {
    const profileMeta: Record<string, { name: string; modelTarget: string; activePrefix: string }> = {
      g1: {
        name: 'Gemini 1 (Subagentes & Velocidad)',
        modelTarget: 'gemini-3.8-flash-high',
        activePrefix: 'agy_g1',
      },
      g2: {
        name: 'Gemini 2 (Chat & Interactivo)',
        modelTarget: 'gemini-3.8-flash-high',
        activePrefix: 'agy_g2',
      },
      son: {
        name: 'Sonnet (Arquitectura & Razonamiento)',
        modelTarget: 'claude-sonnet-4-6',
        activePrefix: 'agy_son',
      },
    };

    const pools: CpamcPoolGroup[] = [];

    for (const [profile, meta] of Object.entries(profileMeta)) {
      const poolAccounts = accounts.filter((a) => a.profile === profile);
      const active = poolAccounts.find((a) => a.status === 'ACTIVE') || null;
      const reserves = poolAccounts.filter((a) => a.status === 'RESERVE');

      let status: 'HEALTHY' | 'WARNING' | 'EXHAUSTED' = 'HEALTHY';
      if (active) {
        const weekly = active.weeklyConsumed ?? 0;
        const fiveH = active.fiveHourConsumed ?? 0;
        if (weekly >= 95.0 || fiveH >= 90.0) {
          status = 'EXHAUSTED';
        } else if (weekly >= 80.0 || fiveH >= 75.0) {
          status = 'WARNING';
        }
      }

      pools.push({
        profile,
        name: meta.name,
        provider: 'antigravity',
        activePrefix: meta.activePrefix,
        modelTarget: meta.modelTarget,
        status,
        activeAccount: active,
        reserves,
      });
    }

    return pools;
  }

  private getSpecialists(): CpamcSpecialistItem[] {
    return [
      {
        prefix: 'ocgo',
        name: 'OpenCode Go',
        provider: 'opencode-go',
        flagshipModel: 'deepseek-v4-flash / deepseek-v4-pro',
        role: 'Salvavidas Código, Contexto Gigante & Testing',
        status: 'ONLINE',
      },
      {
        prefix: 'nv',
        name: 'NVIDIA NIM',
        provider: 'nvidia',
        flagshipModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
        role: 'Especialista Lógica Matemática & Reglas Duras',
        status: 'ONLINE',
      },
    ];
  }
}
