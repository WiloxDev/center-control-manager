# Sources

## Source Index

### S-001: Pi Coding Agent Extension API & TUI Autocomplete
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/extensions/typesafe/node_modules/@earendil-works/pi-coding-agent`
- Date/version: 0.87.1
- Access method: Targeted local source code read
- Used for: Pillar 1 (Ghost text in terminal, `ctx.ui.addAutocompleteProvider`, `pi.on("agent_settled")`, and `pi.on("input")`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Direct local codebase inspection confirmed the exact event names and interfaces for autocompletion providers and lifecycle hooks.

### S-002: Herdr Terminal Multiplexer Socket API & Schema
- Family: PRIMARY
- URL or locator: `https://herdr.dev/docs/socket-api/` / Local binary: `/home/wilox/.local/bin/herdr api schema --json`
- Date/version: 0.9.1 (Protocol 22, Schema v1)
- Access method: Local CLI schema introspection and socket ping
- Used for: Pillar 1 (Zero-copy terminal injection via `pane.send_text`, `pane.send_keys`, `pane.run`, and `pane.read`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Confirmed that Herdr accepts UNIX domain socket connections at `/home/wilox/.config/herdr/herdr.sock` with <5ms round-trip latency.

### S-003: Langfuse Open Source Prompt Management
- Family: PRIMARY
- URL or locator: `https://github.com/langfuse/langfuse` / `https://langfuse.com/docs/prompt-management/overview`
- Date/version: v3.x (2026)
- Access method: Web documentation and GitHub repository code inspection (`packages/shared/src/features/prompts/types.ts`)
- Used for: Pillar 2 (Prompt Store, SemVer versioning, labels `production`/`staging`, dynamic Mustache variable extraction).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Authoritative production reference for prompt schemas, commit messages, and label management.

### S-004: DSPy: Declarative Self-improving Prompt Compilation
- Family: RESEARCH
- URL or locator: `https://github.com/stanfordnlp/dspy` / `https://dspy.ai/`
- Date/version: DSPy 2.5+
- Access method: Web documentation and architectural research
- Used for: Pillar 2 (Prompt signatures, input/output typing, few-shot compilation based on execution history).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Establishes programmatic optimization and signature contracts over manual prompt tweaking.

### S-005: Legwork: Autonomous Project Queue for Claude Code
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/adamentwistle/legwork`
- Date/version: 2026-05
- Access method: GitHub repository inspection (README.md, ARCHITECTURE.md)
- Used for: Pillar 3 (Queueing & Multi-Project "Pickup / Resume", `/wrap` intent freeze, `/pickup` 30-second cold restore).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Demonstrates practical implementation of markdown-backed and SQLite-backed project queues for unattended or interrupted coding sessions.

### S-006: Claude Code Task Queue & Session Resumption
- Family: COMMUNITY
- URL or locator: `https://github.com/anthropics/claude-code/issues/33323`
- Date/version: 2026
- Access method: Issue tracker and developer discussion analysis
- Used for: Pillar 3 (Sequential task queuing, session state retention across developer breaks).
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: Reflects common pain points across coding agent users regarding context switching and lost task queues.

### S-007: AI-DLC Workflows: State Tracking and Intent Audit Trail
- Family: RESEARCH
- URL or locator: `https://awslabs.github.io/aidlc-workflows/guide/10-state-and-audit/`
- Date/version: 2026
- Access method: Web documentation fetch
- Used for: Pillar 4 (Human Intent State Machine, intent traceability from audit to commit).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Provides formal rigor for tracking intent transitions and validating side effects before committing changes.

### S-008: Solving LLM State Drift with Intent-Verify-Commit Patterns
- Family: SECONDARY
- URL or locator: `https://devstacktips.com/backend-development/2026/07/27/failure-analysis-solving-llm-state-drift-with-intent-verify-commit-patterns/`
- Date/version: 2026-07-27
- Access method: Web article and architectural analysis
- Used for: Pillar 4 (Causal transition modeling: Audit -> Plan -> Apply -> Verify loop).
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: Emphasizes why coding agents fail when direct tool execution is attempted without intermediate intent verification gates.

### S-009: Anti-Overengineering Skill
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/skills/anti-overengineering/SKILL.md`
- Date/version: 3.1
- Access method: Local file read
- Used for: Architectural boundary enforcement (KISS/YAGNI, rejection of heavy external vector DBs).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Governing contract prioritizing simplest sufficient solution.

### S-010: Cognitive Doc Design Skill
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/skills/cognitive-doc-design/SKILL.md`
- Date/version: 1.2
- Access method: Local file read
- Used for: Report structuring, cognitive load reduction, tables, progressive disclosure.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Standard formatting and presentation contract.

### S-011: zsh-autosuggestions: Fish-like Autosuggestions for Zsh
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/zsh-users/zsh-autosuggestions`
- Date/version: v0.7.1+
- Access method: GitHub source inspection (`zsh-autosuggestions.zsh`)
- Used for: Pillar 1 (Terminal ghost text rendering using `POSTDISPLAY` and `region_highlight`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Explains how terminal line editors render non-committal ghost text after cursor position.

### S-012: Fish Shell Command Line Architecture
- Family: PRIMARY
- URL or locator: `https://github.com/fish-shell/fish-shell`
- Date/version: fish 3.7+
- Access method: Web documentation and architecture specs
- Used for: Pillar 1 (Terminal inline completion ergonomics and color tokenization).
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: The original implementation reference for interactive shell autosuggestions.

### S-013: Nushell Reedline Line Editor: Hinter Trait
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/nushell/reedline`
- Date/version: 0.38+
- Access method: GitHub source inspection (`src/hinter/mod.rs`, `src/hinter/cwd_aware.rs`)
- Used for: Pillar 1 (Directory-aware hint providers `CwdAwareHinter` and dimmed ANSI styling).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Validates how modern Rust terminal line editors decouple hinting logic from history storage.

### S-014: Python Prompt Toolkit: AutoSuggest Engine
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/prompt-toolkit/python-prompt-toolkit`
- Date/version: 3.0+
- Access method: Library documentation review
- Used for: Pillar 1 (AutoSuggest abstraction in interactive TUI terminals).
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: Industry standard reference for cross-platform terminal autocompletion.

### S-015: Pi Coding Agent Extension Examples
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/extensions/typesafe/node_modules/@earendil-works/pi-coding-agent/examples/extensions/`
- Date/version: 0.87.1
- Access method: Local file reads (`commands.ts`, `input-transform.ts`, `github-issue-autocomplete.ts`)
- Used for: Pillar 1 & Pillar 2 (Slash command registration, input transforms, and fuzzy autocomplete in Pi).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Shows working reference implementations for extending Pi's prompt pipeline and UI.

### S-016: SIO Mission Control Terminal Sessions & Herdr Detection Report
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/projects/sio-mission-control/investigaciones/2026-09-28-0811-terminal-sessions-herdr-detection/report.md`
- Date/version: 2026-09-28
- Access method: Local repository file inspection
- Used for: Pillar 1 (Herdr daemon architecture, socket latencies <4.8ms, active pane resolution).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Ground truth benchmark of Herdr performance in this exact workstation environment.

### S-017: PromptLayer Prompt Management Platform
- Family: SECONDARY
- URL or locator: `https://docs.promptlayer.com/`
- Date/version: 2026
- Access method: Documentation review
- Used for: Pillar 2 (Prompt versioning, tracking, and evaluation metadata).
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: Commercial platform validating metadata requirements for production prompt registries.

### S-018: Pezzo Open Source PromptOps
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/pezzolabs/pezzo`
- Date/version: 2026
- Access method: Repository review
- Used for: Pillar 2 (Client-server prompt delivery, environment tags).
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: Confirms the benefits of decoupling prompt management from application code.
