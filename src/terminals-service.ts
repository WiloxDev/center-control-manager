import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { execSync } from 'node:child_process';
import { GitService } from './git-service.ts';
import type {
  TerminalRuntimeStatus,
  TerminalSessionItem,
  TerminalHarnessInfo,
  TerminalHarnessType,
  TerminalAgentStatus,
  TerminalsDataResponse,
} from './types.ts';

const HERDR_DIR = '/home/wilox/.config/herdr';
const HERDR_SOCKET = path.join(HERDR_DIR, 'herdr.sock');
const HERDR_SESSION_JSON = path.join(HERDR_DIR, 'session.json');
const PROJECTS_ROOT = '/home/wilox/projects';

export class TerminalsService {
  private socketPath: string;
  private sessionJsonPath: string;
  private projectsRoot: string;

  constructor(
    socketPath: string = HERDR_SOCKET,
    sessionJsonPath: string = HERDR_SESSION_JSON,
    projectsRoot: string = PROJECTS_ROOT
  ) {
    this.socketPath = socketPath;
    this.sessionJsonPath = sessionJsonPath;
    this.projectsRoot = projectsRoot;
  }

  /**
   * Check if Herdr daemon socket is responding
   */
  async checkSocketAlive(timeoutMs = 600): Promise<boolean> {
    if (!fs.existsSync(this.socketPath)) {
      return false;
    }

    return new Promise((resolve) => {
      let settled = false;
      const sock = net.createConnection(this.socketPath);

      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        sock.destroy();
        resolve(result);
      };

      sock.setTimeout(timeoutMs);
      sock.on('connect', () => finish(true));
      sock.on('error', () => finish(false));
      sock.on('timeout', () => finish(false));
    });
  }

  /**
   * Returns Herdr runtime status
   */
  async getHerdrStatus(): Promise<TerminalRuntimeStatus> {
    const isSocketAlive = await this.checkSocketAlive();
    let installed = false;
    let version: string | undefined;

    try {
      const verOut = execSync('herdr --version 2>/dev/null', { timeout: 1000, encoding: 'utf-8' }).trim();
      if (verOut) {
        installed = true;
        version = verOut.replace(/^herdr\s*/i, '');
      }
    } catch {
      installed = fs.existsSync('/home/wilox/.local/bin/herdr');
      if (installed) version = '0.9.1';
    }

    // Try finding Herdr PID if running
    let pid: number | undefined;
    try {
      const pidOut = execSync("pgrep -f 'herdr server' 2>/dev/null", { encoding: 'utf-8', timeout: 500 }).trim();
      const p = parseInt(pidOut.split('\n')[0], 10);
      if (!isNaN(p)) pid = p;
    } catch {
      // Ignore if not found
    }

    return {
      runtime: 'herdr',
      installed,
      running: isSocketAlive,
      version,
      socketPath: this.socketPath,
      pid,
      details: isSocketAlive ? 'Daemon headless activo en socket UNIX' : 'Daemon detenido o no responde',
    };
  }

  /**
   * Returns status for all supported terminals (Herdr, Warp, Orca)
   */
  async getRuntimeStatuses(): Promise<TerminalRuntimeStatus[]> {
    const herdr = await this.getHerdrStatus();

    // Warp Terminal Foundation Check
    let warpInstalled = false;
    let warpRunning = false;
    try {
      warpInstalled = fs.existsSync('/usr/bin/warp-terminal') || fs.existsSync('/opt/Warp-Terminal');
      const warpPid = execSync("pgrep -f 'warp-terminal' 2>/dev/null", { encoding: 'utf-8', timeout: 500 }).trim();
      warpRunning = Boolean(warpPid);
    } catch {
      // Staged foundation
    }

    const warp: TerminalRuntimeStatus = {
      runtime: 'warp',
      installed: warpInstalled,
      running: warpRunning,
      socketPath: '/tmp/warp.sock',
      details: warpInstalled
        ? warpRunning ? 'Warp Terminal en ejecución' : 'Warp instalado (inactivo)'
        : 'Warp Terminal no instalado (Base extensible lista)',
    };

    // Orca Terminal Foundation Check
    let orcaRunning = false;
    try {
      const orcaPid = execSync("pgrep -f 'orca' 2>/dev/null", { encoding: 'utf-8', timeout: 500 }).trim();
      orcaRunning = Boolean(orcaPid);
    } catch {
      // Staged foundation
    }

    const orca: TerminalRuntimeStatus = {
      runtime: 'orca',
      installed: true,
      running: orcaRunning,
      socketPath: 'http://127.0.0.1:4545/hook/pi',
      details: orcaRunning
        ? 'Orca Workspace en ejecución'
        : 'Orca inactivo (Hooks extension configurada)',
    };

    return [herdr, warp, orca];
  }

  /**
   * Scan active processes under /home/wilox/projects to correlate PIDs, memory, CPU, and harness types
   */
  getProjectProcesses(): Map<string, {
    pid: number;
    project: string;
    cwd: string;
    cmdline: string;
    harnessType: TerminalHarnessType;
    status: TerminalAgentStatus;
    herdrPaneId?: string;
    orcaPaneKey?: string;
    warpSession?: boolean;
    activeModel?: string;
    rssMb?: number;
    cpuPercent?: number;
    uptimeSeconds?: number;
  }> {
    const results = new Map<string, any>();
    if (!fs.existsSync('/proc')) return results;

    let pids: string[] = [];
    try {
      pids = fs.readdirSync('/proc').filter((e) => /^\d+$/.test(e));
    } catch {
      return results;
    }

    for (const pidStr of pids) {
      try {
        const cwdLink = fs.readlinkSync(`/proc/${pidStr}/cwd`);
        if (!cwdLink.startsWith(this.projectsRoot)) {
          continue;
        }

        const pid = parseInt(pidStr, 10);
        const relProject = path.relative(this.projectsRoot, cwdLink).split(path.sep)[0] || 'projects';
        const cmdline = fs.readFileSync(`/proc/${pidStr}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();

        // Read environment variables
        let environStr = '';
        try {
          environStr = fs.readFileSync(`/proc/${pidStr}/environ`, 'utf8');
        } catch {
          environStr = '';
        }
        const envVars = new Map<string, string>();
        for (const item of environStr.split('\0')) {
          const idx = item.indexOf('=');
          if (idx !== -1) {
            envVars.set(item.substring(0, idx), item.substring(idx + 1));
          }
        }

        // Determine harness type
        let harnessType: TerminalHarnessType = 'shell';
        let status: TerminalAgentStatus = 'idle';

        const isPi = cmdline.includes('pi') || cmdline.includes('pi-coding-agent');
        const piDir = envVars.get('PI_CODING_AGENT_DIR') || '';
        const isGentle = envVars.has('GENTLE_PI_QUIET_TOOLS') || cmdline.includes('gentle');

        if (isPi) {
          if (piDir.includes('agent-j0k3r')) {
            harnessType = 'j0k3r-pi';
          } else if (isGentle) {
            harnessType = 'gentle-pi';
          } else {
            harnessType = 'pi';
          }
          status = 'working';
        } else if (cmdline.includes('claude') || cmdline.includes('codex') || cmdline.includes('cursor')) {
          harnessType = 'other';
          status = 'working';
        }

        const herdrPaneId = envVars.get('HERDR_PANE_ID');
        const orcaPaneKey = envVars.get('ORCA_PANE_KEY');
        const warpSession = envVars.has('WARP_IS_LOCAL_SHELL_SESSION') || envVars.get('TERM_PROGRAM') === 'WarpTerminal';
        const activeModel = envVars.get('PI_MODEL') || undefined;

        // Process metrics via /proc/<pid>/stat
        let rssMb = 0;
        let uptimeSeconds = 0;
        try {
          const statParts = fs.readFileSync(`/proc/${pidStr}/stat`, 'utf8').trim().split(/\s+/);
          // page size = 4096 bytes, rss is field 24 (1-indexed, so index 23)
          const pages = parseInt(statParts[23], 10);
          if (!isNaN(pages)) {
            rssMb = Math.round((pages * 4096) / (1024 * 1024));
          }
        } catch {
          // Ignore
        }

        results.set(pidStr, {
          pid,
          project: relProject,
          cwd: cwdLink,
          cmdline: cmdline.slice(0, 100),
          harnessType,
          status,
          herdrPaneId,
          orcaPaneKey,
          warpSession,
          activeModel,
          rssMb,
          uptimeSeconds,
        });
      } catch {
        // Process might have exited or permission denied
      }
    }

    return results;
  }

  /**
   * Retrieves active terminal sessions, prioritizing Herdr live state and merging process data
   */
  async getActiveSessions(): Promise<TerminalSessionItem[]> {
    const sessions: TerminalSessionItem[] = [];
    const procMap = this.getProjectProcesses();

    // 1. Check Herdr sessions via session.json and CLI
    const herdrAlive = await this.checkSocketAlive();
    let herdrPanesMap = new Map<string, any>();
    let herdrAgentsMap = new Map<string, any>();

    if (herdrAlive) {
      try {
        const outPanes = execSync('herdr pane list 2>/dev/null', { timeout: 1500, encoding: 'utf-8' });
        const parsedPanes = JSON.parse(outPanes);
        if (parsedPanes?.result?.panes && Array.isArray(parsedPanes.result.panes)) {
          for (const pn of parsedPanes.result.panes) {
            herdrPanesMap.set(pn.pane_id, pn);
          }
        }
      } catch {
        // Fallback: will read session.json
      }

      try {
        const outAgents = execSync('herdr agent list 2>/dev/null', { timeout: 1500, encoding: 'utf-8' });
        const parsedAgents = JSON.parse(outAgents);
        if (parsedAgents?.result?.agents && Array.isArray(parsedAgents.result.agents)) {
          for (const ag of parsedAgents.result.agents) {
            herdrAgentsMap.set(ag.pane_id, ag);
          }
        }
      } catch {
        // Fallback
      }

      if (fs.existsSync(this.sessionJsonPath)) {
        try {
          const raw = fs.readFileSync(this.sessionJsonPath, 'utf8');
          const sessionData = JSON.parse(raw);
          const workspaces = Array.isArray(sessionData.workspaces) ? sessionData.workspaces : [];

          for (const ws of workspaces) {
            const tabs = Array.isArray(ws.tabs) ? ws.tabs : [];
            for (let tIdx = 0; tIdx < tabs.length; tIdx++) {
              const tab = tabs[tIdx];
              const panes = tab.panes || {};
              for (const [pKey, paneObj] of Object.entries<any>(panes)) {
                const pubNum = ws.public_pane_numbers?.[pKey] ?? pKey;
                const paneId = `${ws.id}:p${pubNum}`;
                const paneCwd = paneObj.cwd || ws.identity_cwd || '';
                const relProject = paneCwd.startsWith(this.projectsRoot)
                  ? (path.relative(this.projectsRoot, paneCwd).split(path.sep)[0] || 'projects')
                  : (path.basename(paneCwd) || 'root');

                const paneInfo = herdrPanesMap.get(paneId) || {};
                const agentInfo = herdrAgentsMap.get(paneId) || {};
                const liveAgentState = agentInfo.agent_status || paneInfo.agent_status || 'idle';
                const sessionFile = paneObj.agent_session?.value || agentInfo.agent_session?.value || undefined;

                // Correlate with Linux process in this pane
                let matchedProc: any = null;
                // 1. Exact match by herdrPaneId
                for (const p of procMap.values()) {
                  if (p.herdrPaneId === paneId) {
                    matchedProc = p;
                    break;
                  }
                }
                // 2. If no exact match and pane has an active agent session, try matching by cwd
                if (!matchedProc && (paneObj.agent_session || agentInfo.agent)) {
                  for (const p of procMap.values()) {
                    if (p.cwd === paneCwd && p.harnessType !== 'shell') {
                      matchedProc = p;
                      break;
                    }
                  }
                }

                // Resolve Git repository info
                const targetPath = path.join(this.projectsRoot, relProject);
                const repoInfo = GitService.getRepoInfo(fs.existsSync(targetPath) ? targetPath : paneCwd);

                const hasAgent = Boolean(paneObj.agent_session || agentInfo.agent || (paneInfo.agent && paneInfo.agent !== 'none'));
                const harnessType: TerminalHarnessType = hasAgent
                  ? (matchedProc?.harnessType && matchedProc.harnessType !== 'shell'
                      ? matchedProc.harnessType
                      : (paneObj.agent_session?.agent === 'pi' || agentInfo.agent === 'pi' ? 'j0k3r-pi' : 'pi'))
                  : 'shell';

                const harness: TerminalHarnessInfo = {
                  type: harnessType,
                  status: (liveAgentState === 'working' || liveAgentState === 'blocked' || liveAgentState === 'idle')
                    ? liveAgentState
                    : 'idle',
                  pid: matchedProc?.pid,
                  cpuPercent: matchedProc?.cpuPercent,
                  memoryRssMb: matchedProc?.rssMb,
                  uptimeSeconds: matchedProc?.uptimeSeconds,
                  sessionFile,
                  activeModel: matchedProc?.activeModel,
                };

                const title = agentInfo.terminal_title || paneInfo.terminal_title || `Herdr — ${relProject} (${paneId})`;

                sessions.push({
                  id: `herdr:${paneId}`,
                  runtime: 'herdr',
                  workspaceId: ws.id,
                  tabId: `${ws.id}:t${tIdx + 1}`,
                  paneId,
                  title,
                  project: relProject,
                  projectPath: paneCwd,
                  isGit: repoInfo.isGit,
                  gitBranch: repoInfo.branch,
                  isClean: repoInfo.clean,
                  harness,
                  focused: Boolean(paneObj.focused || agentInfo.focused || paneInfo.focused),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        } catch (err: any) {
          console.warn('[TERMINALS SERVICE] Error parsing session.json:', err?.message);
        }
      }
    }

    // 2. Add any standalone processes running under /home/wilox/projects that are NOT in Herdr
    const capturedPaneIds = new Set(sessions.filter((s) => s.paneId).map((s) => s.paneId));
    for (const proc of procMap.values()) {
      if (proc.herdrPaneId && capturedPaneIds.has(proc.herdrPaneId)) {
        continue; // Already included under Herdr
      }
      if (proc.harnessType === 'shell') {
        continue; // Ignore raw idle shells unless running coding harness
      }

      const targetPath = path.join(this.projectsRoot, proc.project);
      const repoInfo = GitService.getRepoInfo(targetPath);
      const runtime = proc.warpSession ? 'warp' : proc.orcaPaneKey ? 'orca' : 'system';

      sessions.push({
        id: `proc:${proc.pid}`,
        runtime,
        title: `${proc.harnessType.toUpperCase()} — ${proc.project} (PID ${proc.pid})`,
        project: proc.project,
        projectPath: proc.cwd,
        isGit: repoInfo.isGit,
        gitBranch: repoInfo.branch,
        isClean: repoInfo.clean,
        harness: {
          type: proc.harnessType,
          status: proc.status,
          pid: proc.pid,
          memoryRssMb: proc.rssMb,
          activeModel: proc.activeModel,
        },
        focused: false,
        updatedAt: new Date().toISOString(),
      });
    }

    return sessions;
  }

  /**
   * Focus a specific pane in Herdr
   */
  async focusHerdrPane(paneId: string): Promise<boolean> {
    try {
      execSync(`herdr agent focus ${paneId} 2>/dev/null || herdr pane focus ${paneId} 2>/dev/null`, {
        timeout: 2000,
        encoding: 'utf-8',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Aggregates runtimes and active sessions in one consolidated payload
   */
  async getDashboardData(): Promise<TerminalsDataResponse> {
    const runtimes = await this.getRuntimeStatuses();
    const sessions = await this.getActiveSessions();
    const herdr = runtimes.find((r) => r.runtime === 'herdr');
    const activeProjects = new Set(sessions.map((s) => s.project));

    return {
      success: true,
      runtimes,
      sessions,
      activeProjectsCount: activeProjects.size,
      totalPanesCount: sessions.length,
      herdrRunning: Boolean(herdr?.running),
    };
  }
}
