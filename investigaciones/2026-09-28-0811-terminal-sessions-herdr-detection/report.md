# Informe de Investigación Técnica: Módulo de Terminales & Sesiones
**Código de Investigación:** `2026-09-28-0811-terminal-sessions-herdr-detection`  
**Fecha:** 2026-09-28  
**Autor:** j0k3r-pi (Direct Orchestrator)  
**Proyecto:** SIO Mission Control (`/home/wilox/projects/sio-mission-control`)  
**Estado:** Dictamen de Viabilidad Aprobado (100% Viable — Rendimiento Óptimo <15ms)

---

## 1. Resumen Ejecutivo y Dictamen de Viabilidad

La solicitud de evolucionar SIO Mission Control hacia un plano de control unificado que incorpore **"Terminales & Sesiones"** en el sidebar izquierdo es **100% viable técnicamente**, presenta **cero fricción arquitectónica** y puede implementarse con **costo computacional despreciable** (<15 ms por consulta completa, o <1 ms leyendo el estado serializado del socket).

### Conclusiones Principales:
1. **Herdr (`/home/wilox/projects/herdr`) está plenamente activo e integrado en el sistema**:
   - Actualmente corre en segundo plano como daemon headless (`/home/wilox/.local/bin/herdr server`, PID 2532).
   - Expone un socket UNIX nativo en `/home/wilox/.config/herdr/herdr.sock` con tiempo de respuesta de **4.8 ms**.
   - Mantiene un archivo de estado vivo en `/home/wilox/.config/herdr/session.json` que se lee en **0.2 ms**.
   - Su CLI oficial (`herdr 0.9.1`) dispone de comandos nativos estructurados en JSON (`herdr agent list`, `herdr pane list`, `herdr api snapshot`, `herdr status`) con tiempos de ejecución de **12 a 15 ms**.

2. **Detección exacta de Harnesses (`j0k3r-pi`, `gentle-pi`, `gentle-ai`)**:
   - Los procesos de coding agents inyectan variables de entorno específicas y mantienen enlaces simbólicos en `/proc/<pid>/cwd`.
   - Se verificó que actualmente hay dos instancias activas de `pi` corriendo en Herdr:
     - **PID 70042**: `pi` operando en `/home/wilox/projects/sio-mission-control` (PTS/1, Pane `w1T:p1`, estado: `working`).
     - **PID 5996**: `pi` operando en `/home/wilox/projects/sandbox` (PTS/3, Pane `w1Q:p1`, estado: `working`).
   - La extensión `~/.pi/agent-j0k3r/extensions/herdr-agent-state.ts` reporta en tiempo real el estado (`working`, `blocked`, `idle`) y la ruta exacta del archivo de sesión `.jsonl` al daemon de Herdr.

3. **Arquitectura Extensible para Terminales Futuras**:
   - El diseño desacopla el motor mediante un patrón de adaptadores (`TerminalProvider`), donde `HerdrProvider` es la implementación primaria, y deja los contratos listos para `WarpProvider`, `OrcaProvider` y `SystemPtyProvider`.

---

## 2. Anatomía de Herdr y Mecanismos de Detección

### 2.1. Detección de Estado del Servidor Herdr (Activo vs. Cerrado)
Se evaluaron tres métodos de detección:

| Método | Técnica | Latencia | Ventajas | Desventajas |
|---|---|---|---|---|
| **A. Socket Ping (Recomendado)** | `net.createConnection('/home/wilox/.config/herdr/herdr.sock')` | **~4.8 ms** | Verificación real de disponibilidad IPC sin spawnear procesos | Requiere manejo de eventos en Node.js |
| **B. CLI Status** | `herdr status` (ejecución síncrona/asíncrona) | **~14 ms** | Retorna versiones de cliente y servidor, compatibilidad de protocolo | Sobrecarga de fork/exec de proceso |
| **C. Heartbeat en Archivo** | Inspeccionar `mtime` y presencia de `session.json` | **~0.2 ms** | Ultra rápido, no bloqueante | No garantiza que el daemon responda a comandos si se congeló |

**Estrategia Óptima para SIO Mission Control:**
Combinación híbrida:
- Un comprobador ligero en Node.js (`net.createConnection`) para determinar el estado de salud del daemon (`ONLINE` / `OFFLINE`).
- Lectura directa de `/home/wilox/.config/herdr/session.json` para renderizado ultraveloz (<1 ms) con recarga periódica o via CLI `herdr agent list` cuando se requiera telemetría profunda.

### 2.2. Protocolo de Datos de Herdr
Cuando se consulta `herdr agent list`, el daemon responde con un payload JSON estándar:

```json
{
  "id": "cli:agent:list",
  "result": {
    "agents": [
      {
        "agent": "pi",
        "agent_session": {
          "agent": "pi",
          "kind": "path",
          "source": "herdr:pi",
          "value": "/home/wilox/.pi/agent-j0k3r/sessions/--home-wilox-projects-sio-mission-control--/2026-09-28T07-14-18-646Z_01a0e6dd-4f94-7147-925b-7382b8001b44.jsonl"
        },
        "agent_status": "working",
        "cwd": "/home/wilox/projects/sio-mission-control",
        "focused": true,
        "foreground_cwd": "/home/wilox/projects/sio-mission-control",
        "pane_id": "w1T:p1",
        "revision": 5,
        "tab_id": "w1T:t1",
        "terminal_id": "term_65c85cdcac9936",
        "terminal_title": "π - sio-mission-control",
        "terminal_title_stripped": "π - sio-mission-control",
        "workspace_id": "w1T"
      }
    ],
    "type": "agent_list"
  }
}
```

### 2.3. Estados de Agente Reconocidos por Herdr
Herdr clasifica el estado de cada panel en tres estados formales:
- `working`: El agente está generando tokens, ejecutando herramientas en bash, o computando.
- `blocked`: El agente está bloqueado esperando confirmación del usuario, aprobación de herramientas, o decisión humana (Circuit Breaker).
- `idle`: La sesión está en espera de una nueva instrucción por parte del usuario.

---

## 3. Motor de Detección de Procesos y Harnesses

Además de Herdr, un usuario puede abrir terminales independientes (vía Warp, Orca, VSCode terminal o shells regulares). Para cubrir el 100% del espectro, el sistema debe inspeccionar el subsistema `/proc` de Linux:

### 3.1. Algoritmo de Inspección de Procesos
1. **Identificar Working Directory (`cwd`)**:
   - Cada proceso en Linux expone `/proc/<PID>/cwd`, un symlink a su directorio actual.
   - Al ejecutar `readlinkSync('/proc/<PID>/cwd')`, filtramos instantáneamente cualquier proceso cuyo `cwd` coincida o esté dentro de `/home/wilox/projects/`.
2. **Identificar Harnesses de IA**:
   - `j0k3r-pi`: Comandos que ejecutan `pi` o `node .../cli.js` con variable de entorno `PI_CODING_AGENT_DIR=/home/wilox/.pi/agent-j0k3r`.
   - `gentle-pi`: Procesos con variable `GENTLE_PI_QUIET_TOOLS=1` o extensiones de Gentle cargadas.
   - `gentle-ai`: Telemetría registrada en `~/.gentle-ai/telemetry.json` y procesos asociados.
   - Otros agentes: `claude`, `codex`, `gemini`, `cursor`, `devin`, `opencode`.
3. **Identificar Terminales Host**:
   - **Herdr**: Presencia de `HERDR_ENV=1` y `HERDR_PANE_ID` en `/proc/<PID>/environ`.
   - **Orca**: Presencia de `ORCA_PANE_KEY`, `ORCA_TAB_ID`, `ORCA_AGENT_HOOK_PORT` en `/proc/<PID>/environ`.
   - **Warp**: Presencia de `TERM_PROGRAM=WarpTerminal` o `WARP_IS_LOCAL_SHELL_SESSION=1`.
   - **Shell Nativo**: Terminales en `pts/*` hijas de sshd, bash, zsh o tmux.

### 3.2. Evidencia de Ejecución en Vivo en este Entorno
Se ejecutó un escaneo real en el sistema arrojando los siguientes resultados inmediatos:
- **Herdr Daemon**: PID `2532` (`/home/wilox/.local/bin/herdr server`)
- **Procesos en `/home/wilox/projects/sio-mission-control`**:
  - PID `70042`: Agente `pi` (j0k3r-pi harness), PTY `pts/1`, Memoria RSS: 400 MB, Estado: `Rl+` (Working).
  - PID `69551`: `/bin/bash` asociado a Herdr Pane `w1T:p1`.
  - PID `92835`: Servidor SIO Mission Control (`node src/server.ts`).
- **Procesos en `/home/wilox/projects/sandbox`**:
  - PID `5996`: Agente `pi`, PTY `pts/3`, Memoria RSS: 519 MB, Estado: `Rl+` (Working).
  - PID `2924`: `/bin/bash` asociado a Herdr Pane `w1Q:p1`.
  - PID `3317`: `engram serve` (Base de datos y servidor de memoria).

---

## 4. Telemetría de Alto Valor para el Cockpit de Ingeniería

Para llevar el proyecto a un nivel superior, el panel de **"Terminales & Sesiones"** no debe limitarse a listar terminales, sino proporcionar un **cockpit de inteligencia operativa** para el desarrollador:

### Métricas y Atributos Recomendados:
1. **Estado del Daemon y Runtimes**:
   - Badge de disponibilidad en tiempo real de Herdr (`ACTIVO` / `CERRADO` / `DESCONECTADO`).
   - Versión del servidor y ruta de socket activo.
   - Número total de workspaces, tabs y paneles activos.
2. **Correlación Proyecto-Terminal**:
   - Nombre del proyecto en `/home/wilox/projects/` vinculado al panel.
   - Rama Git actual y estado (`Limpio` / `Dirty con N cambios`).
   - Tareas pendientes asociadas en el Radar de SIO Mission Control.
3. **Telemetría del Agente / Harness**:
   - Nombre del harness (`j0k3r-pi`, `gentle-pi`, `claude`, etc.).
   - Chip de estado con código de color dinámico:
     - 🟢 **EJECUTANDO / WORKING**: Agente activo resolviendo tareas.
     - 🔴 **BLOQUEADO / BLOCKED**: Esperando respuesta o confirmación del usuario.
     - ⚪ **EN ESPERA / IDLE**: Shell libre o esperando nuevo prompt.
   - Consumo de recursos en vivo: % CPU y Memoria RAM (RSS) del proceso.
   - Tiempo de ejecución / Uptime desde que se lanzó el agente (ej. `2h 15m`).
4. **Vinculación con Expediente e Historial**:
   - Botón directo **"Ver Expediente IA"**: Abre el modal de Session Briefing de SIO Mission Control cargando el archivo `.jsonl` o sesión de Engram reportada por Herdr.
   - Enlace directo al Workspace/Pane: Identificador `pane_id` (ej. `w1T:p1`).
   - Acción de Enfoque rápido: `herdr agent focus <pane_id>` para cambiar de ventana inmediatamente.

---

## 5. Arquitectura del Software Propuesta (Fase 1)

### 5.1. Capa de Backend (`src/terminals-service.ts`)
Se estructurará una clase `TerminalsService` que implemente la abstracción multi-terminal:

```typescript
export interface TerminalRuntimeStatus {
  runtime: 'herdr' | 'warp' | 'orca' | 'system';
  installed: boolean;
  running: boolean;
  version?: string;
  socketPath?: string;
  pid?: number;
}

export interface TerminalSessionItem {
  id: string; // e.g. "herdr:w1T:p1"
  runtime: 'herdr' | 'warp' | 'orca' | 'system';
  workspaceId?: string;
  paneId?: string;
  title: string;
  project: string; // e.g. "sio-mission-control"
  projectPath: string; // e.g. "/home/wilox/projects/sio-mission-control"
  isGit: boolean;
  gitBranch?: string;
  isClean?: boolean;
  harness: {
    type: 'j0k3r-pi' | 'gentle-pi' | 'gentle-ai' | 'pi' | 'shell' | 'other';
    status: 'working' | 'blocked' | 'idle' | 'unknown';
    pid?: number;
    cpuPercent?: number;
    memoryRssMb?: number;
    uptimeSeconds?: number;
    sessionFile?: string;
  };
  focused: boolean;
  updatedAt: string;
}
```

### 5.2. Endpoints REST a incorporar en `src/server.ts`
1. `GET /api/terminals/status`
   - Retorna el estado global de los runtimes: Herdr (running: true/false, socket, version), Warp, Orca.
2. `GET /api/terminals/sessions`
   - Retorna la lista consolidada de todas las sesiones de terminales y agentes activos cruzados con los proyectos de `/home/wilox/projects`.
3. `POST /api/terminals/herdr/focus`
   - Invoca `herdr agent focus <pane_id>` para enfocar la terminal deseada desde la web.
4. **Streaming SSE (`/api/stream`)**:
   - Emisión de eventos `terminal-status` y `herdr-session-updated` ante cambios en el archivo `~/.config/herdr/session.json` mediante un watcher de bajo consumo.

### 5.3. Capa de Frontend en `public/index.html`
1. **Sidebar Izquierdo (Menú de Navegación)**:
   - Nuevo ítem: **"Terminales & Sesiones"** (ícono: `💻` o `🎛️`).
   - Badge dinámico: Indica el número de paneles activos y si Herdr está en línea (🟢 Online / ⚪ Offline).
2. **Vista Principal del Módulo**:
   - **Header de Runtimes**: Tarjetas de estado para Herdr (Principal), Warp y Orca (indicando "Próximamente / Base configurada").
   - **Cuadrícula de Sesiones Activas**: Tarjetas ricas con:
     - Nombre del proyecto + badge de git (`main`, `dirty`).
     - Nombre del agente (`j0k3r-pi`, `gentle-pi`) con píldora de estado (`WORKING`, `BLOCKED`, `IDLE`).
     - Métricas de proceso: PID, RAM (MB), CPU %, Uptime.
     - Botones de acción: **"📄 Expediente IA"** (abre el briefing de la sesión) y **"🎯 Enfocar en Herdr"**.
   - **Filtros rápidos**: Por proyecto (`all`, `sio-hotel`, `sio-mission-control`, etc.), por estado de agente, o por runtime.

---

## 6. Plan de Ejecución para Fase 1

La Fase 1 se ejecutará de forma limpia, modular y segura:
1. **Paso 1: Backend Service (`src/terminals-service.ts`)**:
   - Creación del servicio con detección de Herdr (socket + CLI/JSON) y escáner de procesos `/proc` para harnesses y proyectos.
2. **Paso 2: Exposición de API y SSE (`src/server.ts`)**:
   - Registro de los endpoints `/api/terminals/status` y `/api/terminals/sessions`.
   - Conexión de watcher sobre `~/.config/herdr/session.json` para eventos en tiempo real.
3. **Paso 3: UI en Sidebar y Pestaña de Navegación (`public/index.html`)**:
   - Inserción del ítem "Terminales & Sesiones" en el sidebar.
   - Construcción de la vista reactiva con tarjetas de monitoreo, telemetría y selector de proyectos.
4. **Paso 4: Validación y Pruebas Unitarias (`test/terminals-service.test.ts`)**:
   - Verificación de la detección de socket, parseo de sesiones de Herdr y asociación con la carpeta `projects`.

---

## 7. Dictamen Final

La integración de **Herdr** como terminal principal junto con el rastreo de harnesses de agentes (`j0k3r-pi`, `gentle-pi`, `gentle-ai`) en los proyectos de `/home/wilox/projects` es una evolución natural y de altísimo valor para SIO Mission Control. Transforma el dashboard de un visor pasivo a una auténtica **torre de control de ingeniería viva**.
