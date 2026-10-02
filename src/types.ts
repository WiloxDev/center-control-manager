export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
export type TaskCategory = 'FEATURE' | 'BUGFIX' | 'INFRASTRUCTURE' | 'DEVOPS' | 'HARDWARE' | 'FUTURE_IDEA';

export type ViewMode = 'grid' | 'table' | 'kanban' | 'compact';
export type Density = 'sm' | 'md' | 'lg';
export type ProjectOrigin = 'LOCAL_GIT' | 'LOCAL_DIR' | 'HISTORICAL_ENGRAM';

export interface TaskNote {
  id: string;
  taskId: string;
  author: 'user' | 'ai' | 'system' | string;
  content: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  project: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  originSessionId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tags: string[];
  notes?: TaskNote[];
}

export interface AuditLogEntry {
  id: string;
  eventType: 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'TASK_NOTE_ADDED' | 'PROJECT_SETTINGS_UPDATED' | 'SYNC_EXECUTED' | 'ENGRAM_QUERY_ERROR' | 'SESSION_BRIEFING_ERROR';
  entityType: 'TASK' | 'NOTE' | 'PROJECT' | 'SYNC' | 'ENGRAM';
  entityId: string;
  project: string;
  description: string;
  createdAt: string;
}

export interface EngramObservation {
  id: number;
  syncId: string;
  sessionId: string;
  type: string;
  title: string;
  content: string;
  project: string;
  scope: string;
  topicKey: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EngramSession {
  id: string;
  project: string;
  directory: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
  active: boolean;
  promptsCount?: number;
  observationsCount?: number;
}

export interface EngramPrompt {
  id: number;
  sessionId: string;
  project: string;
  content: string;
  createdAt: string;
}

export interface ParsedSessionSummary {
  goal?: string;
  instructions?: string;
  discoveries: string[];
  accomplished: string[];
  keyDecisions: string[];
  nextSteps: string[];
  relevantFiles: string[];
}

export interface SessionBriefing {
  session: EngramSession;
  prompts: EngramPrompt[];
  observations: EngramObservation[];
  summaryRaw?: string;
  parsedSummary: ParsedSessionSummary;
  relatedTasks: ProjectTask[];
  meta?: {
    isHistoricalEngram?: boolean;
    sourceProject?: string;
    fetchedAt?: string;
    readOnly?: boolean;
    isError?: boolean;
    errorMessage?: string;
  };
}

export interface CloudSyncStatus {
  configured: boolean;
  serverUrl?: string;
  lifecycle: string;
  lastEnqueuedSeq: number;
  lastAckedSeq: number;
  pendingMutations: number;
  enrolledProjects: string[];
  lastSyncAt?: string;
}

export interface ProjectSetting {
  project: string;
  isFavorite: boolean;
  isHidden: boolean;
  alias?: string;
  updatedAt: string;
}

export interface ProjectSummary {
  name: string;
  path: string;
  exists: boolean;
  isGitRepo: boolean;
  origin: ProjectOrigin;
  gitBranch?: string;
  lastCommit?: string;
  isClean?: boolean;
  observationsCount: number;
  decisionsCount: number;
  bugfixesCount: number;
  pendingTasksCount: number;
  cloudEnrolled: boolean;
  isFavorite: boolean;
  isHidden: boolean;
  alias?: string;
}

export type TerminalRuntimeType = 'herdr' | 'warp' | 'orca' | 'system';
export type TerminalHarnessType = 'gentle-pi' | 'gentle-ai' | 'pi' | 'shell' | 'other';
export type TerminalAgentStatus = 'working' | 'blocked' | 'idle' | 'unknown';

export interface TerminalRuntimeStatus {
  runtime: TerminalRuntimeType;
  installed: boolean;
  running: boolean;
  version?: string;
  socketPath: string;
  pid?: number;
  details?: string;
}

export interface TerminalHarnessInfo {
  type: TerminalHarnessType;
  status: TerminalAgentStatus;
  statusMessage?: string;
  pid?: number;
  cpuPercent?: number;
  memoryRssMb?: number;
  uptimeSeconds?: number;
  sessionFile?: string;
  activeModel?: string;
}

export interface TerminalSessionItem {
  id: string; // e.g. "herdr:w1T:p1" or "proc:70042"
  runtime: TerminalRuntimeType;
  workspaceId?: string;
  tabId?: string;
  paneId?: string;
  title: string;
  project: string; // e.g. "center-control-manager"
  projectPath: string; // e.g. "/path/to/project"
  isGit: boolean;
  gitBranch?: string;
  isClean?: boolean;
  harness: TerminalHarnessInfo;
  focused: boolean;
  updatedAt: string;
}

export interface TerminalsDataResponse {
  success: boolean;
  runtimes: TerminalRuntimeStatus[];
  sessions: TerminalSessionItem[];
  activeProjectsCount: number;
  totalPanesCount: number;
  herdrRunning: boolean;
}

export interface CpamcAccountItem {
  id: string;
  email: string;
  prefix: string;
  status: 'ACTIVE' | 'RESERVE';
  fiveHourConsumed: number | null; // percentage e.g. 27.6
  weeklyConsumed: number | null; // percentage e.g. 62.9
  minAvailable: number | null; // percentage e.g. 37.1
  note?: string;
  resetDate?: string;
}

export interface CpamcPoolGroup {
  profile: string; // 'g1' | 'g2' | 'son'
  name: string; // 'Gemini 1' | 'Gemini 2' | 'Sonnet 4.6'
  provider: 'antigravity';
  activePrefix: string;
  activeAccount: CpamcAccountItem | null;
  reserves: CpamcAccountItem[];
  modelTarget: string;
  status: 'HEALTHY' | 'WARNING' | 'EXHAUSTED';
}

export interface CpamcSpecialistItem {
  prefix: string;
  name: string;
  provider: string;
  flagshipModel: string;
  role: string;
  status: 'ONLINE' | 'STANDBY';
}

export interface CpamcStatusResponse {
  success: boolean;
  timestamp: string;
  pools: CpamcPoolGroup[];
  specialists: CpamcSpecialistItem[];
  thresholds: {
    fiveHour: number;
    weekly: number;
  };
  autoSwitcherAvailable: boolean;
  rawListOutput?: string;
}

export interface TelemetryStats {
  total_requests: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  cache_creation_tokens: number;
  estimated_cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  earliest_time?: number;
  latest_time?: number;
}

export interface TelemetryAccountItem {
  account: string;
  provider: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_latency_ms: number;
  prefix?: string;
  cleanName?: string;
}

export interface TelemetryModelItem {
  model: string;
  provider: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  avg_latency_ms: number;
  is_priced: boolean;
}

export interface TelemetryTimelineItem {
  time_bucket: string;
  timestamp: number;
  total_requests: number;
  success_requests: number;
  failed_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_latency_ms: number;
}

export interface TelemetrySnapshot {
  success: boolean;
  timestamp: string;
  range: string;
  stats: TelemetryStats | null;
  accounts: TelemetryAccountItem[];
  models: TelemetryModelItem[];
  timeline: TelemetryTimelineItem[];
}

