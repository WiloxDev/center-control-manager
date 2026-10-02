# Sources

## Source Index

### S-001: PM2 Production & Development Process Manager
- Family: PRIMARY
- URL or locator: https://github.com/Unitech/pm2
- Date/version: 2026-09-04 / v5.4.x
- Access method: GitHub API & repository inspection
- Used for: Evaluation of PM2 in Process Managers, ecosystem config, startup daemon, and comparison table.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 43.3k stars. Active maintenance. Native Node.js supervisor with clustering, log aggregation, and systemd integration (`pm2 startup`).

### S-002: Process Compose
- Family: PRIMARY
- URL or locator: https://github.com/F1bonacc1/process-compose
- Date/version: 2026-09-21 / v1.40.x
- Access method: GitHub API & repository inspection
- Used for: Evaluation of Process Compose in Process Managers, YAML orchestration, TUI dashboard, dependencies, and comparison table.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 2.8k stars. Written in Go. Highly active in 2026. procfile/compose-like scheduler for non-containerized processes.

### S-003: Overmind Process Manager
- Family: PRIMARY
- URL or locator: https://github.com/DarthSim/overmind
- Date/version: 2025-04-04 / v2.5.x
- Access method: GitHub API & repository inspection
- Used for: Evaluation of Overmind in Process Managers, Procfile + tmux terminal workflows.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 3.7k stars. Excellent for interactive terminal debugging, but lacks autonomous daemon/reboot persistence out of the box.

### S-004: Foreman and Hivemind Procfile Runners
- Family: PRIMARY
- URL or locator: https://github.com/ddollar/foreman & https://github.com/DarthSim/hivemind
- Date/version: 2025-07-27 / 2023-12-12
- Access method: GitHub API & repository inspection
- Used for: Procfile runners comparison and limitations.
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: Foreman (6.1k stars, Ruby) and Hivemind (1.1k stars, Go). Foreground dev runners without restart/persistence or dynamic proxying.

### S-005: Poku Test Runner and Service Manager
- Family: PRIMARY
- URL or locator: https://github.com/wellwelwel/poku
- Date/version: 2026-08-30 / v3.x
- Access method: GitHub API & repository inspection
- Used for: Evaluation of Poku in category 1; clarifying scope as test runner with background service support rather than a permanent dev orchestrator.
- Usefulness: CONTEXT
- Confidence impact: HIGH
- Notes: 1.2k stars. Clarified distinction: Poku manages transient background services during test suites (`startService`), not long-running persistent dev servers.

### S-006: Mprocs Command Runner
- Family: PRIMARY
- URL or locator: https://github.com/pvolok/mprocs
- Date/version: 2026-09-26 / v0.7.x
- Access method: GitHub API & repository inspection
- Used for: Evaluation of terminal multi-process runners.
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: 2.7k stars. Written in Rust. TUI for parallel interactive commands; does not run as background daemon across reboots.

### S-007: Caddy Web Server & Reverse Proxy
- Family: PRIMARY
- URL or locator: https://github.com/caddyserver/caddy
- Date/version: 2026-09-26 / v2.8.x
- Access method: GitHub API & official docs
- Used for: Reverse proxy evaluation, automatic HTTPS, wildcard `*.localhost` handling, and Caddyfile architecture.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 76.1k stars. Ultra-popular Go reverse proxy. Native `*.localhost` resolution, minimal config, low RAM (~35MB), built-in systemd packaging.

### S-008: Traefik Cloud Native Application Proxy
- Family: PRIMARY
- URL or locator: https://github.com/traefik/traefik
- Date/version: 2026-09-25 / v3.1.x
- Access method: GitHub API & official docs
- Used for: Reverse proxy evaluation, Docker label discovery, LXC100/Proxmox bridge integration, web dashboard.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 65.0k stars. Industry standard for Docker dynamic routing; supports file provider for bare-metal Node.js services.

### S-009: Nginx Local Web Server
- Family: PRIMARY
- URL or locator: https://nginx.org/en/docs/ & Ubuntu 24.04 pkg `nginx 1.28.3`
- Date/version: 2026-09-22 / v1.28.3
- Access method: Local system inspection (`nginx -v`, `ps aux`, `ss -tulpn`)
- Used for: Evaluation of existing reverse proxy already running on VM101 port 80.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Already running on port 80 on `soytec` with 4 worker processes (~20MB total RAM). Can route `*.localhost` to internal ports immediately with zero installation.

### S-010: Puma-dev
- Family: PRIMARY
- URL or locator: https://github.com/puma/puma-dev
- Date/version: 2024-05-13 / v0.15.x
- Access method: GitHub API & repository inspection
- Used for: Port conflict manager and local DNS proxy evaluation.
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: 1.8k stars. Rack/Puma centric; symlink-based port proxying. Linux integration requires systemd/resolvconf setup that is prone to breakages compared to macOS.

### S-011: Typicode Hotel
- Family: PRIMARY
- URL or locator: https://github.com/typicode/hotel
- Date/version: 2023-10-23 / v0.8.x (Unmaintained)
- Access method: GitHub API & repository inspection
- Used for: Historical analysis of local dev process managers with automatic `*.localhost` domains.
- Usefulness: DISCARDED
- Confidence impact: HIGH
- Notes: 10.0k stars. Effectively abandoned (last push Oct 2023). Node compatibility issues with modern versions (v20+). Discarded for production/dev use.

### S-012: RFC 6761 Special-Use Domain Names & systemd-resolved
- Family: PRIMARY
- URL or locator: https://datatracker.ietf.org/doc/html/rfc6761 & man systemd-resolved
- Date/version: 2013 / Systemd v255
- Access method: Local terminal test (`getent hosts test.localhost`, `curl http://test.localhost`)
- Used for: Evidence that `*.localhost` domains resolve out of the box in Linux and modern browsers without editing `/etc/hosts` or installing `dnsmasq`.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Tested live on `soytec`: `getent hosts foo.localhost` immediately returns `::1` and `127.0.0.1`. Eliminates local DNS server maintenance overhead.

### S-013: Mise (formerly rtx) Polyglot Tool & Task Manager
- Family: PRIMARY
- URL or locator: https://github.com/jdx/mise & https://mise.jdx.dev/tasks/
- Date/version: 2026-09-27 / v2026.9.12
- Access method: GitHub API and local binary inspection (`mise --version`, `mise help run`)
- Used for: Evaluation of Local Dev Environment Managers and interaction with Node v24 on VM101.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 34.3k stars. Already installed on `soytec`. Manages Node v24.21.0, environment variables, and tasks. Does not supervise daemons across reboots natively, but works as runner for PM2/Systemd.

### S-014: Devbox by Jetify
- Family: PRIMARY
- URL or locator: https://github.com/jetify-com/devbox
- Date/version: 2026-09-25 / v0.13.x
- Access method: GitHub API & documentation
- Used for: Evaluation of isolated dev environments and embedded service orchestration (`devbox services`).
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: 12.4k stars. Wraps Nix in user-friendly JSON schema. Uses Process-Compose under the hood for services. Adds extra abstraction layer over existing `mise`.

### S-015: Devenv
- Family: PRIMARY
- URL or locator: https://github.com/cachix/devenv
- Date/version: 2026-09-26 / v1.3.x
- Access method: GitHub API & documentation
- Used for: Nix-based composable development environments.
- Usefulness: CONTEXT
- Confidence impact: HIGH
- Notes: 7.7k stars. Powerful declarative config, but steep Nix learning curve and overhead for lightweight VM.

### S-016: DDEV Local Docker Development Environment
- Family: PRIMARY
- URL or locator: https://github.com/ddev/ddev
- Date/version: 2026-09-26 / v1.23.x
- Access method: GitHub API & documentation
- Used for: All-in-one container dev manager, automatic reverse router, and port conflict resolution.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: 3.9k stars. Robust container-per-project model with automatic `*.ddev.site` routing. Significant RAM overhead (~500MB-1GB per project container) for 7.1GB VM.

### S-017: Lando
- Family: PRIMARY
- URL or locator: https://github.com/lando/lando
- Date/version: 2026-08-20 / v3.21.x
- Access method: GitHub API & documentation
- Used for: All-in-one multi-project development orchestrator evaluation.
- Usefulness: SUPPORTING
- Confidence impact: MEDIUM
- Notes: 4.2k stars. Docker Compose abstraction. Good tooling but similar high memory/disk overhead as DDEV.

### S-018: DevPod by Loft Labs
- Family: PRIMARY
- URL or locator: https://github.com/loft-sh/devpod
- Date/version: 2025-11-14 / v0.6.x
- Access method: GitHub API & documentation
- Used for: All-in-one Dev Container runner evaluation.
- Usefulness: CONTEXT
- Confidence impact: HIGH
- Notes: 15.2k stars. Tailored for remote Dev Containers in IDEs (VS Code, JetBrains), not for background autonomous homelab services.

### S-019: Laravel Valet Linux Port
- Family: PRIMARY
- URL or locator: https://github.com/cpriego/valet-linux
- Date/version: 2026-08-11 / v2.3.x
- Access method: GitHub API & documentation
- Used for: Evaluation of local dev proxy and automatic domain park/link.
- Usefulness: CONTEXT
- Confidence impact: MEDIUM
- Notes: 1.5k stars. Linux port of macOS Valet. Coupled to PHP/FPM and Dnsmasq; ill-suited for pure Node.js/Docker hybrid environments.

### S-020: Tilt Microservice Dev Tool
- Family: PRIMARY
- URL or locator: https://github.com/tilt-dev/tilt
- Date/version: 2026-09-17 / v0.33.x
- Access method: GitHub API & documentation
- Used for: Multi-service development orchestrator evaluation.
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: 10.1k stars. Excellent Web UI and live rebuild engine, but designed for active interactive terminal sessions, not unattended reboot persistence.

### S-021: Systemd User Services & Linger Administration
- Family: PRIMARY
- URL or locator: https://www.freedesktop.org/software/systemd/man/systemd.unit.html & man loginctl
- Date/version: 2026 / Systemd v255
- Access method: Systemd man pages and local inspection (`loginctl show-user wilox`)
- Used for: Pattern 6 (Systemd user units, lingering, auto-restart, template units `node-project@.service`).
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Linux native standard. Identified key insight on `soytec`: `Linger=no` currently prevents user services from running across reboots without an active user session.

### S-022: Local Infrastructure Inspection & Telemetry (VM101 `soytec`)
- Family: IMPLEMENTATION
- URL or locator: local:/home/wilox/projects/ (`ss -tulpn`, `docker ps`, `mise`, `systemctl`)
- Date/version: 2026-09-27
- Access method: Local read-only bash commands
- Used for: Contextualizing real constraints: RAM (7.1GB), existing Nginx on port 80, existing Docker containers (MinIO, Redis, CPAMC), Node v24 via mise, project layout.
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Confirmed that Nginx 1.28.3 is actively bound to port 80, MinIO on 9000/9001, Redis on 6379, CPAMC on 8317, and Node v24 is managed via mise.
