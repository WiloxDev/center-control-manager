# Fuentes de Investigación (Sources)

## Source Index

### S-001: Pi Coding Agent SDK Reference Documentation
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/docs/sdk.md`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Programmatic in-process embedding API, `createAgentSession`, `SessionManager`, `ResourceLoader`, session lifecycle, event subscription, and configuration boundaries.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Authoritative primary documentation of the official Pi SDK API exported by `@earendil-works/pi-coding-agent`.

### S-002: Pi Extensions Architecture & ExtensionAPI Specification
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Extension hooks (`before_agent_start`, `agent_settled`, `turn_end`), tool registration (`pi.registerTool`), command creation (`pi.registerCommand`), custom UI widgets, and provider injection.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Documents in-process TypeScript runtime lifecycle and security model.

### S-003: Pi Packages Specification & Distribution Model
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Package format (`pi` manifest in `package.json`), conventional folder layouts (`extensions/`, `skills/`, `prompts/`, `themes/`), distribution via npm/git, and dependency isolation.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Authoritative guide for bundling agent extensions and skills into distributable npm artifacts.

### S-004: Pi RPC Architecture & Headless Subprocess Protocol
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/docs/rpc.md`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Comparison between in-process SDK embedding vs. out-of-process RPC JSONL subprocess daemon, framing requirements, and UI event passing.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Documents headless daemon patterns for integration into web services, Electron apps, and CLI orchestrators.

### S-005: Pi Terminal UI (`@earendil-works/pi-tui`) Specification
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Terminal rendering components, `ctx.ui` extensions, widget placement (`belowEditor`), overlays, input management, and theme binding.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Explains how custom widgets (like the subagents progress bar and status lines) render without creating secondary renderers.

### S-006: Official SDK Full Control Example
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/examples/sdk/12-full-control.ts`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: Demonstrating custom `ResourceLoader`, in-memory `SettingsManager`, custom `ModelRuntime`, and explicit tool provisioning without filesystem discovery.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Code reference showing total control over agent initialization.

### S-007: Production Subagent Manager & SDK Runner Implementation
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/npm/node_modules/pi-subagents-j0k3r/src/runner/sdk-runner.ts` & `/home/wilox/.pi/agent-j0k3r/npm/node_modules/pi-subagents-j0k3r/src/manager.ts`
- Date/version: v0.87.1 runtime target
- Access method: read / local inspection
- Used for: Proving existing real-world implementation of nested sessions via `createAgentSession`, `DefaultResourceLoader`, `isolateSubagentExtensions`, and background concurrency in `j0k3r-pi`.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Core evidence demonstrating that the SDK already supports multi-agent nested harnesses in production.

### S-008: Official Package Manifest & License
- Family: PRIMARY
- URL or locator: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/package.json`
- Date/version: v0.87.1
- Access method: read / local inspection
- Used for: License verification (MIT), entry points (`dist/index.js`, `dist/bundle/cli.js`, `dist/bundle/rpc-entry.js`), and Node engine constraints (`>=22.19.0`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Confirms permissive MIT licensing, enabling commercial redistribution, homologated re-branding, and container packaging.

### S-009: Local Architecture of j0k3r-pi Distribution
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/.pi/agent-j0k3r/`
- Date/version: Current local deployment
- Access method: bash directory traversal & inspection
- Used for: Documenting the current distribution layout: subagents (`subagents/`), extensions (`extensions/`), skills (`skills/`), themes (`themes/`), and configuration (`subagents.json`, `settings.json`, `mcp.json`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Real baseline that will be packaged as the homologated SIO Agent product.

### S-010: SIO Amauta Architecture & Specification
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/projects/sio-mission-control/investigaciones/2026-09-28-1320-sio-amauta-deep-intelligence/report.md`
- Date/version: 2026-09-28
- Access method: read / local inspection
- Used for: Architecture of SIO Amauta (SQLite FTS5 prompt memory, `/ro`, `/go`, `/wrap`, `/pickup`, Herdr socket injection, zero-copy workflows).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Identifies the custom intelligence layer to be bundled alongside j0k3r-pi into the unified product.
