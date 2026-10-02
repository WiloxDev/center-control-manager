# Sources

## Source Index

### S-001: Pi Coding Agent SDK (@earendil-works/pi-coding-agent)
- Family: PRIMARY
- URL or locator: `https://www.npmjs.com/package/@earendil-works/pi-coding-agent` / Local inspect: `/home/wilox/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent`
- Date/version: 2026 / v0.87+
- Access method: local node inspect & npm view
- Used for: Foundational Headless Agent Engine (`createAgentSession`, `defineTool`, `SessionManager`, `DefaultResourceLoader`)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Authoritative runtime engine for in-process agentic execution. Validated in production inside `pi-subagents-j0k3r`.

### S-002: Model Context Protocol (MCP) Specification
- Family: PRIMARY
- URL or locator: `https://modelcontextprotocol.io` / `https://github.com/modelcontextprotocol`
- Date/version: 2024–2026
- Access method: curl & web inspection
- Used for: Architecture of SIO Enterprise Nervous System (tools, resources, stdio/SSE transports)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Open industry standard initiated by Anthropic for exposing enterprise tools and data sources to LLM agents uniformly.

### S-003: Model Context Protocol TypeScript SDK (@modelcontextprotocol/sdk)
- Family: PRIMARY
- URL or locator: `https://github.com/modelcontextprotocol/typescript-sdk` / npm `@modelcontextprotocol/sdk`
- Date/version: v1.30.1
- Access method: npm view & github api
- Used for: Implementing MCP Client Bridge in TypeScript and developing SIO Hotel/Facturador/CRM MCP servers
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Standard TypeScript implementation supporting both `StdioClientTransport` and `SSEClientTransport`.

### S-004: Evolution API v2 (Evolution Foundation)
- Family: PRIMARY
- URL or locator: `https://github.com/evolution-foundation/evolution-api`
- Date/version: 2026 / v2.x
- Access method: github api & documentation inspection
- Used for: Omnichannel Ingestion Layer for WhatsApp (REST/WebSocket, Multi-instance, Baileys & Cloud API support)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 9,700+ GitHub stars. Leading open-source API gateway for WhatsApp integration with built-in webhook dispatch and Typebot/Chatwoot bridge.

### S-005: Chatwoot Omnichannel Customer Engagement Platform
- Family: PRIMARY
- URL or locator: `https://github.com/chatwoot/chatwoot`
- Date/version: 2026 / v3.x
- Access method: github api & documentation inspection
- Used for: Unified Omnichannel Inbox, Agent Bot Webhook API, Human Handoff and Operator Queue
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 37,200+ GitHub stars. Premier open-source customer support platform supporting WhatsApp, Facebook Messenger, Instagram Direct, Webchat, and Email.

### S-006: WhiskeySockets / Baileys
- Family: IMPLEMENTATION
- URL or locator: `https://github.com/WhiskeySockets/Baileys`
- Date/version: 2026 / v6.7+
- Access method: github api
- Used for: Low-level WhatsApp Web socket protocol analysis and comparison
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: 11,100+ GitHub stars. Lightweight TypeScript socket library without browser dependencies; serves as the underlying engine for Evolution API.

### S-007: Meta Graph API & WhatsApp Business Platform
- Family: PRIMARY
- URL or locator: `https://developers.facebook.com/docs/whatsapp/cloud-api` & `https://developers.facebook.com/docs/messenger-platform`
- Date/version: 2026 / Graph API v20+
- Access method: official documentation review
- Used for: Official WhatsApp Cloud API, Facebook Messenger Webhooks, and Instagram Direct Messaging APIs
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Required for zero-ban risk enterprise messaging and official Instagram Direct messaging within the 24-hour service window.

### S-008: PostgreSQL Model Context Protocol Server (@modelcontextprotocol/server-postgres)
- Family: IMPLEMENTATION
- URL or locator: `https://www.npmjs.com/package/@modelcontextprotocol/server-postgres` / `https://github.com/modelcontextprotocol/servers`
- Date/version: v0.6.2
- Access method: npm view & github repo inspection
- Used for: Connecting LLM agents directly to PostgreSQL databases (SIO-Hotel PMS schema inspection and query execution)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Official reference implementation for PostgreSQL interaction over MCP.

### S-009: SQLite WAL (Write-Ahead Logging) & FTS5 Specification
- Family: PRIMARY
- URL or locator: `https://sqlite.org/wal.html` & `https://sqlite.org/fts5.html`
- Date/version: SQLite 3.45+
- Access method: official documentation review
- Used for: Anti-Overengineering persistence layer for session debouncing, message queueing, and Amauta fast intent classification
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: Eliminates the need for Redis/Kafka in single-node and SME deployments, sustaining >10,000 read/write operations per second.

### S-010: SIO Amauta Deep Intelligence Architecture & Prompt Vault
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/projects/sio-mission-control/investigaciones/2026-09-28-1320-sio-amauta-deep-intelligence/` / Engram observation #1150
- Date/version: 2026-09-28
- Access method: Engram search & local filesystem
- Used for: Cognitive Prompt Vault, Domain Policy Guardrails, and Intent Classifier for Hotel, SUNAT, and CRM
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Local architectural lineage establishing the prompt banking and intent prediction framework for SIO agents.

### S-011: SIO Mission Control CCTV & Terminales Engine
- Family: IMPLEMENTATION
- URL or locator: `/home/wilox/projects/sio-mission-control/` / Engram observation #1000
- Date/version: 2026-09-28
- Access method: Engram search & local codebase
- Used for: Real-time CCTV 1920px multi-column monitoring, agent telemetry, and manual takeover interface
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Homologated 4-column responsive cockpit with Herdr Unix socket integration and Server-Sent Events (SSE).
