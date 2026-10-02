# Fuentes y Evidencias de Investigación: Terminales & Sesiones (Herdr, Harnesses y Proyectos)
**Fecha:** 2026-09-28  
**Investigador:** j0k3r-pi (Direct Orchestrator)  
**Directorio de Investigación:** `investigaciones/2026-09-28-0811-terminal-sessions-herdr-detection/`

---

## 1. Archivos y Rutas Inspeccionadas en el Sistema

### 1.1. Herdr (Runtime de Terminales para Agentes de Código)
- **Repositorio local fuente:** `/home/wilox/projects/herdr`
  - `/home/wilox/projects/herdr/src/session.rs` (Gestión de sesiones, `is_running_at`, rutas de sockets).
  - `/home/wilox/projects/herdr/src/ipc.rs` (Conexiones `LocalStream` sobre sockets de dominio UNIX).
  - `/home/wilox/projects/herdr/src/config/io.rs` (Resolución de directorios de configuración `~/.config/herdr`).
  - `/home/wilox/projects/herdr/README.md` (Documentación del runtime de agentes).
- **Instalación binaria activa:** `/home/wilox/.local/bin/herdr` (Versión `0.9.1`).
- **Archivos de configuración y estado en tiempo real:**
  - `/home/wilox/.config/herdr/herdr.sock` (Socket de servidor UNIX activo; latencia medida de conexión: 4.82 ms).
  - `/home/wilox/.config/herdr/herdr-client.sock` (Socket de cliente).
  - `/home/wilox/.config/herdr/session.json` (Snapshot serializado en disco de todos los workspaces, tabs, paneles y sesiones de agentes; latencia de lectura: 0.20 ms).
  - `/home/wilox/.config/herdr/herdr-server.log` (Registro de eventos del servidor Herdr).

### 1.2. Harnesses de Agentes (`j0k3r-pi`, `gentle-pi`, `gentle-ai`)
- **Directorio de j0k3r-pi:** `/home/wilox/.pi/agent-j0k3r`
- **Extensión de integración con Herdr:**
  - `/home/wilox/.pi/agent-j0k3r/extensions/herdr-agent-state.ts`
  - Utiliza `net.createConnection` al socket de Herdr.
  - Métodos JSON-RPC implementados: `pane.report_agent` y `pane.report_agent_session`.
  - Estados reportados: `working`, `blocked`, `idle`.
  - Eventos de Pi capturados: `session_start`, `agent_start`, `agent_settled`, `herdr:blocked`.
- **Configuración en Shell:**
  - `/home/wilox/.bashrc`:
    - `alias jpi='PI_CODING_AGENT_DIR=~/.pi/agent-j0k3r mise exec node@24.21.0 -- node ~/.pi/agent-j0k3r/pi-runtime/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js'`
    - `export GENTLE_PI_QUIET_TOOLS=1` (identificador de Gentle Pi).
- **Telemetría Gentle AI:**
  - `/home/wilox/.gentle-ai/telemetry.json` (Instalación activa con telemetría de revisiones y sincronización).

### 1.3. Evidencias de Orca y Warp
- **Orca:**
  - `/home/wilox/projects/backup/config-pi/archived-extensions/orca-agent-status.ts`
  - Variables de entorno identificadas: `ORCA_PANE_KEY`, `ORCA_TAB_ID`, `ORCA_WORKTREE_ID`, `ORCA_AGENT_HOOK_PORT`, `ORCA_AGENT_HOOK_TOKEN`.
- **Warp:**
  - Variables de entorno del emulador: `TERM_PROGRAM=WarpTerminal`, `WARP_IS_LOCAL_SHELL_SESSION=1`, `WARP_SESSION_ID`.

---

## 2. Comandos y Pruebas Ejecutadas en Vivo

### 2.1. Verificación de CLI y Socket de Herdr
```bash
herdr status
# Resultado: client: version 0.9.1 / server: status running, socket: /home/wilox/.config/herdr/herdr.sock

herdr agent list
# Resultado: 2 agentes detectados (π - sandbox y π - sio-mission-control) con estado "working"

herdr workspace list
# Resultado: 3 workspaces activos (sandbox, sio-mission-control)

herdr api snapshot
# Resultado: payload JSON completo con workspaces, panes, tabs y agents.
```

### 2.2. Medición de Tiempos de Respuesta
- `herdr agent list`: **12.26 ms**
- `herdr api snapshot`: **15.96 ms**
- `net.createConnection(/home/wilox/.config/herdr/herdr.sock)`: **4.82 ms**
- `fs.readFileSync(/home/wilox/.config/herdr/session.json)`: **0.20 ms**

### 2.3. Detección en `/proc` de Proyectos y Procesos Activos
Escaneo de procesos con directorio de trabajo (`cwd`) bajo `/home/wilox/projects`:
- PID `70042` (`pi` - j0k3r-pi) -> `/home/wilox/projects/sio-mission-control`
- PID `69551` (`/bin/bash`) -> `/home/wilox/projects/sio-mission-control`
- PID `92835` (`node src/server.ts`) -> `/home/wilox/projects/sio-mission-control`
- PID `5996` (`pi` - j0k3r-pi) -> `/home/wilox/projects/sandbox`
- PID `2924` (`/bin/bash`) -> `/home/wilox/projects/sandbox`
- PID `3317` (`engram serve`) -> `/home/wilox/projects/sandbox`
- PID `2532` (`herdr server`) -> Proceso padre de las sesiones de terminal en PTY.
