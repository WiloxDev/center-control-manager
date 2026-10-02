import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECTS_ROOT = '/home/wilox/projects';
const IGNORED_DIRS = new Set(['.atl', 'backup', 'node_modules', '.git']);

export class GitService {
  static discoverProjects(): Array<{ name: string; path: string }> {
    if (!fs.existsSync(PROJECTS_ROOT)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(PROJECTS_ROOT, e.name),
        }));
    } catch {
      return [];
    }
  }

  static getRepoInfo(repoPath: string): { isGit: boolean; branch?: string; lastCommit?: string; clean?: boolean } {
    if (!fs.existsSync(repoPath)) {
      return { isGit: false };
    }

    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return { isGit: false };
    }

    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { cwd: repoPath, encoding: 'utf-8', timeout: 1500 }).trim();
      const lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null', { cwd: repoPath, encoding: 'utf-8', timeout: 1500 }).trim();
      const status = execSync('git status --porcelain 2>/dev/null', { cwd: repoPath, encoding: 'utf-8', timeout: 1500 }).trim();
      return {
        isGit: true,
        branch: branch || undefined,
        lastCommit: lastCommit || undefined,
        clean: status.length === 0,
      };
    } catch {
      return { isGit: true };
    }
  }
}
