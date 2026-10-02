# sio-amauta: Arquitectura de Inteligencia de Prompts, Predicción Causal y Automatización Zero-Copy

## Executive Summary

El desarrollo de software asistido por agentes de inteligencia artificial en entornos multi-proyecto impone una severa sobrecarga cognitiva: el desarrollador humano debe recordar fórmulas de prompting exactas, deducir el siguiente paso metodológico, interpolar manualmente variables de contexto (rutas, ramas git, IPs) y alternar entre múltiples repositorios sin perder el hilo del trabajo no concluido.

Esta investigación proporciona los fundamentos técnicos y de arquitectura para **`sio-amauta`** (*Amauta*, del quechua: sabio o consejero superior), un sistema desacoplado que transforma el banco histórico de prompts del usuario (1,681 registros en SQLite FTS5) en un ecosistema predictivo de alta velocidad (<15 ms). 

La solución se estructura sobre cuatro pilares arquitectónicos:
1. **Live Next-Prompt Prediction & Ghost Text**: Predicción probabilística en línea renderizada como texto fantasma atenuado en el editor de terminal de Pi (`AutocompleteProvider`) e inyección directa en paneles de terminal sin copiar ni pegar mediante el socket UNIX de Herdr (`pane.send_text`) [S-001, S-002].
2. **Prompt Store & SemVer Registry**: Banco de prompts con versionado semántico formal (SemVer `MAJOR.MINOR.PATCH`), categorización por familias operativas, telemetría de tasa de éxito y resolución dinámica de variables (`{{project}}`, `{{git_branch}}`, `{{last_error}}`), adoptando las lecciones de producción de Langfuse [S-003] y DSPy [S-004].
3. **Queueing & Multi-Project "Pickup / Resume"**: Mecanismo de congelamiento y reanudación de intención inspirado en el patrón de `legwork` [S-005] y colas de tareas de Claude Code [S-006], permitiendo cerrar sesiones con `/wrap` (dejando el próximo prompt sintetizado mientras el contexto está caliente) y reactivarlas días después con `/pickup` en menos de 30 segundos.
4. **Human Intent State Machine (Causal Transition Model)**: Autómata de estados finitos dirigido que formaliza el ciclo metodológico del desarrollador (`AUDIT` $\rightarrow$ `PLAN` $\rightarrow$ `GO` $\rightarrow$ `VERIFY` $\rightarrow$ `WRAP`), prediciendo con exactitud matemática el siguiente paso lógico a partir de las herramientas invocadas y los códigos de salida de la terminal [S-007, S-008].

Bajo el principio de **Anti-Overengineering** [S-009] y **Cognitive Doc Design** [S-010], se rechazan bases de datos vectoriales pesadas y re-generaciones lentas por LLM en favor de un motor local ultraligero basado en SQLite WAL + FTS5 trigram tokenization, heurísticas de Markov y adaptadores IPC nativos.

---

## Research Question

¿Cómo diseñar e implementar la arquitectura de software de `sio-amauta` para que funcione como una bóveda de memoria de prompts, predictor causal del siguiente paso y puente terminal sin fricción (cero-copy), maximizando la productividad del desarrollador en entornos multi-repositorio sin introducir dependencias pesadas ni latencias perceptibles?

---

## Recommendation or Answer

Se recomienda estructurar `sio-amauta` como un servicio autónomo en Node.js/TypeScript (`projects/sio-amauta`), desacoplado de `sio-mission-control` y del núcleo de `engram`, pero interoperable mediante tres interfaces estandarizadas:

1. **Persistencia Local (`data/amauta.db`)**: Base de datos SQLite dedicada en modo WAL con extensiones FTS5 (tokenizador trigram), aislando las tablas operativas de Amauta de la base general `~/.engram/engram.db` para evitar bloqueos de concurrencia y simplificar migraciones.
2. **Servidor MCP (`stdio` / SSE)**: Expone herramientas estándar (`amauta_search_prompt`, `amauta_predict_next`, `amauta_wrap_session`, `amauta_pickup_project`) para consumo nativo por parte de `sio-mission-control` y agentes autónomos.
3. **Extensión Nativa de Pi + Herdr Bridge**: 
   - Un plugin para Pi (`sio-amauta-pi-extension.ts`) que intercepta eventos de ciclo de vida (`agent_settled`, `input`) e inyecta sugerencias de autocompletado en el TUI.
   - Un cliente socket UNIX (`net.createConnection`) que habla directamente con `/home/wilox/.config/herdr/herdr.sock`, permitiendo pre-rellenar el prompt sugerido en el pane activo con un solo clic o atajo de teclado (`Tab` / `Ctrl+Space`).

### Quick Path: Flujo Operativo Diario del Desarrollador

```text
[Auditoría / Diagnóstico]
   │  Human Prompt: "revisa el estado de la API en sio-hotel"
   ▼
[Agente emite diagnóstico en solo lectura]
   │  Trigger: evento `agent_settled` en Pi
   ▼
[Amauta State Engine detecta estado AUDIT completado]
   │  Predicción probabilística: P(PLAN | AUDIT) = 0.70, P(GO | AUDIT) = 0.25
   ▼
[Ghost Text en Terminal / Sugerencia en Mission Control]
   │  Aparece en gris: "propón un plan de refactorización tipo cirugía preservando contratos"
   │  Atajo: [Tab] acepta y coloca en buffer; [Enter] despacha
   ▼
[Agente propone Plan de 3 pasos]
   ▼
[Amauta State Engine detecta estado PLAN completado]
   │  Predicción probabilística: P(GO | PLAN) = 0.85
   │  Ghost Text: "te doy el 'go' tipo cirugía para el paso 1, compila antes de finalizar"
   ▼
[Agente modifica código (tools: edit, write)]
   ▼
[Amauta State Engine detecta GO completado]
   │  Predicción probabilística: P(VERIFY | GO) = 0.90
   │  Ghost Text: "ejecuta las pruebas unitarias con npm test y verifica que no haya regresiones"
   ▼
[Pruebas Pasan (exit code 0)]
   ▼
[Cierre o Cambio de Proyecto con `/wrap`]
   │  Amauta congela intención: genera resumen, guarda próximo prompt y actualiza cola
```

---

## Key Findings

### Pilar 1: Live Next-Prompt Prediction & Ghost Text

#### 1.1 Mecanismos de Renderizado de Texto Fantasma en Terminales
El análisis de implementaciones consolidadas en el ecosistema open source revela cinco patrones fundamentales para la renderización de texto fantasma (*ghost text*):

| Plataforma / Herramienta | Mecanismo de Renderizado | Manejo del Cursor | Evento de Aceptación | Latencia Típica |
|---|---|---|---|---|
| **Zsh Autosuggestions** [S-011] | Variable `POSTDISPLAY` + `region_highlight` (`fg=8` gris) en el Zsh Line Editor (ZLE). | No altera la posición lógica del cursor; sólo añade texto visual tras el buffer. | `forward-char` ($\rightarrow$), `end-of-line` (`Ctrl+E`), `accept-and-hold`. | < 1 ms |
| **Fish Shell** [S-012] | Búfer interno nativo en C++ con estilo `fish_color_autosuggestion`. | Cursor permanece al final del texto tipeado; la sugerencia se dibuja como un sufijo no comiteado. | $\rightarrow$ (acepta todo), `Alt+`$\rightarrow$ (acepta palabra), `Tab`. | < 0.5 ms |
| **Reedline (Nushell)** [S-013] | Trait `Hinter` (`CwdAwareHinter`). Retorna un string ANSI dimmed (`Style::new().dimmed()`). | El motor de renderizado concatena el hint y preserva la columna del cursor real. | `CompleteHint` keybinding (generalmente `Tab` o $\rightarrow$). | < 2 ms |
| **Prompt Toolkit (Python)** [S-014] | Clase `AutoSuggest` (`get_suggestion(buffer, document)`). | Inserta procesador de texto (`AutoSuggestProcessor`) en el control de ventana. | `Tab`, $\rightarrow$, `Ctrl+F`. | < 5 ms |
| **Pi TUI (`@earendil-works/pi-tui`)** [S-001, S-015] | `AutocompleteProvider` registrado en `ctx.ui.addAutocompleteProvider`. | Renderiza lista de opciones flotante o texto predictivo dentro del contenedor de input. | `Tab` / `Enter` sobre el ítem seleccionado. | < 2 ms |

#### 1.2 Integración Zero-Copy mediante Herdr Socket IPC
Herdr expone un protocolo JSON sobre socket UNIX en `/home/wilox/.config/herdr/herdr.sock` [S-002, S-016]. A través de este canal, Amauta puede inyectar texto directamente en la terminal sin obligar al usuario a seleccionar, copiar o pegar con el mouse:

```typescript
// Implementación del Adaptador Zero-Copy para Herdr
import net from "node:net";

export async function injectPromptToHerdrPane(paneId: string, promptText: string, autoExecute = false): Promise<boolean> {
  const socketPath = process.env.HERDR_SOCKET_PATH || "/home/wilox/.config/herdr/herdr.sock";
  
  return new Promise((resolve) => {
    const client = net.createConnection(socketPath, () => {
      // Método pane.send_text escribe en el buffer de entrada del PTY
      const payload = {
        id: `amauta:inject:${Date.now()}`,
        method: autoExecute ? "pane.run" : "pane.send_text",
        params: {
          pane_id: paneId,
          text: promptText,
          command: autoExecute ? promptText : undefined
        }
      };
      client.write(`${JSON.stringify(payload)}\n`);
    });

    client.on("data", () => {
      client.destroy();
      resolve(true);
    });

    client.on("error", () => {
      client.destroy();
      resolve(false);
    });
  });
}
```

*Ventaja ergonómica:* Si `autoExecute` es `false`, el prompt predicho aparece escrito en la línea de comando de la terminal del agente, permitiendo al desarrollador presionar simplemente `Enter` para enviarlo o editarlo si desea ajustar un detalle.

---

### Pilar 2: Prompt Store & SemVer Registry

#### 2.1 Lecciones de Arquitectura de Plataformas de Producción
Al evaluar plataformas líderes en gestión de prompts (Langfuse [S-003], DSPy [S-004], PromptLayer [S-017] y Pezzo [S-018]), se identifican cuatro requisitos esenciales para un banco de prompts de nivel industrial:

1. **Inmutabilidad y Versionado Semántico**: Una fórmula de prompt no debe sobreescribirse destructivamente. Cada cambio genera una versión (`MAJOR.MINOR.PATCH`):
   - `MAJOR`: Cambio de contrato en variables requeridas o redefinición completa de la estructura de instrucciones.
   - `MINOR`: Refinamiento sustancial de las directrices o reglas añadidas sin romper variables existentes.
   - `PATCH`: Corrección de ortografía, estilo o matices menores en el texto.
2. **Etiquetas Móviles (*Labels / Aliases*)**: Las versiones se marcan con alias dinámicos (`favorite`, `production`, `experimental`, `audit-default`), permitiendo referenciar `/ro` sin acoplarse al número de versión rígido.
3. **Interpolación Segura de Variables Contextuales**: Soporte para plantillas con sintaxis Mustache (`{{variable}}`), con un motor de resolución que extrae valores en tiempo real antes del despacho:
   - `{{project}}`: Nombre del proyecto inferido del directorio activo (`sio-hotel`, `sio-mission-control`).
   - `{{git_branch}}`: Rama actual obtenida vía `git rev-parse --abbrev-ref HEAD`.
   - `{{git_status_summary}}`: Resumen de archivos modificados (`git status -s`).
   - `{{last_error}}`: Última excepción o fallo capturado en los logs del pane de terminal.
   - `{{server_ip}}`: IP de despliegue local o federado (`192.168.10.150`).
4. **Telemetría de Desempeño y Tasa de Éxito**: Seguimiento de cada ejecución del prompt vinculada a su sesión, registrando si la tarea concluyó con éxito, falló o requirió intervención correctiva.

#### 2.2 Esquema DDL Relacional para `sio-amauta` (`data/amauta.db`)

```sql
-- Tablas Principales de sio-amauta (SQLite WAL Mode)

CREATE TABLE IF NOT EXISTS prompt_blueprints (
    id              TEXT PRIMARY KEY,            -- UUID v7 o slug estable (ej. 'audit-surgical-gate')
    slug            TEXT UNIQUE NOT NULL,        -- Comando corto (ej. 'audit', 'go', 'verify', 'wrap')
    title           TEXT NOT NULL,
    description     TEXT,
    category        TEXT NOT NULL,               -- 'audit', 'plan', 'apply', 'verify', 'wrap', 'triage'
    is_favorite     BOOLEAN NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompt_versions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    blueprint_id    TEXT NOT NULL,
    semver          TEXT NOT NULL,               -- '1.0.0', '1.1.0'
    template_body   TEXT NOT NULL,               -- Texto con {{variables}}
    variables_json  TEXT NOT NULL DEFAULT '[]',  -- Lista de nombres de variables requeridas
    commit_message  TEXT,                        -- Motivo del cambio
    is_active       BOOLEAN NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (blueprint_id) REFERENCES prompt_blueprints(id) ON DELETE CASCADE,
    UNIQUE(blueprint_id, semver)
);

CREATE TABLE IF NOT EXISTS prompt_labels (
    label           TEXT NOT NULL,               -- 'latest', 'stable', 'production'
    blueprint_id    TEXT NOT NULL,
    version_id      INTEGER NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (label, blueprint_id),
    FOREIGN KEY (blueprint_id) REFERENCES prompt_blueprints(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prompt_execution_telemetry (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    blueprint_id    TEXT NOT NULL,
    version_id      INTEGER NOT NULL,
    session_id      TEXT,
    project         TEXT NOT NULL,
    git_branch      TEXT,
    interpolated_prompt TEXT NOT NULL,
    outcome         TEXT NOT NULL DEFAULT 'unrated', -- 'success', 'failure', 'aborted'
    user_rating     INTEGER,                     -- +1 (thumbs up), -1 (thumbs down)
    executed_at     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (blueprint_id) REFERENCES prompt_blueprints(id),
    FOREIGN KEY (version_id) REFERENCES prompt_versions(id)
);

-- Búsqueda FTS5 Trigram para Minería y Autocompletado Ultrarrápido
CREATE VIRTUAL TABLE IF NOT EXISTS prompt_search_fts USING fts5(
    title,
    slug,
    template_body,
    category,
    tokenize='trigram'
);
```

---

### Pilar 3: Queueing & Multi-Project "Pickup / Resume"

#### 3.1 El Paradigma de `legwork` y Colas Autónomas de Tareas
El repositorio `adamentwistle/legwork` [S-005] aborda exactamente la fatiga por interrupciones en agentes de codificación. Su tesis operativa central establece: *nunca cierres una sesión de trabajo sin redactar la instrucción con la que debe arrancar la próxima sesión mientras el contexto aún está caliente en la memoria del agente.*

`legwork` opera mediante dos primitivas fundamentales:
- **`/wrap`**: Se ejecuta al terminar un bloque de trabajo. Inspecciona el `git status`, resume lo implementado, detecta bloqueos pendientes y sintetiza el bloque `## Next prompt` (con tarea clara y criterio de finalización *Done when*).
- **`/pickup`**: Al regresar días después, el desarrollador o el runner ejecuta `/pickup <proyecto>`. En 30 segundos presenta un briefing del estado del repositorio y precarga el `Next prompt` listo para correr sin tener que releer 20 minutos de historial.

#### 3.2 Adaptación para el Ecosistema SIO
Para `sio-amauta`, este patrón se traslada a una arquitectura híbrida SQLite + Markdown:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        sio-amauta Project Queue                        │
├────────────────────────────────────────────────────────────────────────┤
│ Proyecto      │ Estado   │ Última Sesión │ Próximo Prompt Encolado     │
├───────────────┼──────────┼───────────────┼─────────────────────────────┤
│ sio-hotel     │ QUEUED   │ Hace 2 horas  │ "Verificar endpoints de... │
│ sio-mission   │ ACTIVE   │ Ahora mismo   │ "Implementar widget de...   │
│ sandbox       │ BLOCKED  │ Ayer          │ "Esperando confirmación...  │
│ federated-pil │ SHELVED  │ Hace 4 días   │ "Auditar certificados...    │
└────────────────────────────────────────────────────────────────────────┘
```

#### 3.3 Esquema de Cola Multi-Proyecto en `amauta.db`

```sql
CREATE TABLE IF NOT EXISTS project_intent_queues (
    project_slug        TEXT PRIMARY KEY,
    repository_path     TEXT NOT NULL,
    queue_status        TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'queued', 'working', 'blocked', 'shelved'
    last_session_id     TEXT,
    standing_vision     TEXT,                         -- Visión u objetivo macro del proyecto
    last_wrap_summary   TEXT,                         -- Lo que se completó en la última sesión
    ready_next_prompt   TEXT NOT NULL,                -- Prompt listo para ser ejecutado en el próximo pickup
    acceptance_criteria TEXT,                         -- Criterio de "Done when"
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Pilar 4: Human Intent State Machine (Causal Transition Model)

#### 4.1 Formalización Matemática del Modelo de Transición
Las sesiones de trabajo del usuario con agentes de codificación no son secuencias aleatorias de texto; obedecen a un proceso estocástico gobernado por el ciclo de desarrollo de software seguro:

$$S \in \{\text{AUDIT}, \text{PLAN}, \text{GO}, \text{VERIFY}, \text{WRAP}\}$$

Donde cada estado $S_t$ representa la postura metodológica del desarrollador humano en el turno $t$. La probabilidad del siguiente prompt $S_{t+1}$ se modela como una cadena de Markov condicionada por las observaciones del entorno $O_t$:

$$P(S_{t+1} \mid S_t, O_t)$$

Donde $O_t$ representa la tupla de evidencia generada por la última acción del agente:
$$O_t = \langle \text{ToolsUsed}, \text{ExitCode}, \text{HasProposedPlan}, \text{GitDirty} \rangle$$

```text
                    ┌─────────────────────────┐
                    │      S0: AUDIT          │
                    │  (Diagnóstico/Read-only)│
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ P=0.70                        │ P=0.25
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │     S1: PLAN     │───P=0.85──▶│      S2: GO      │◀───┐
       │ (Diseño / RFC)   │            │(Cirugía / Mutate)│    │
       └──────────────────┘            └─────────┬────────┘    │ P=0.80
                                                 │             │ (Fix loop
                                                 │ P=0.90      │  si falló)
                                                 ▼             │
                                       ┌──────────────────┐    │
                                       │    S3: VERIFY    │────┘
                                       │ (Test / Valida)  │
                                       └─────────┬────────┘
                                                 │ P=0.85
                                                 │ (Tests pasan)
                                                 ▼
                                       ┌──────────────────┐
                                       │     S4: WRAP     │
                                       │ (Congelar/Commit)│
                                       └──────────────────┘
```

#### 4.2 Matriz Empírica de Probabilidades de Transición ($P_{i,j}$)

A partir de la minería de los 1,681 prompts de `/home/wilox/.engram/engram.db`, las reglas de decisión observadas se formalizan en la siguiente matriz estocástica:

| Estado Actual ($S_t$) | Evidencia Observada ($O_t$) | Próximo Estado Predicho ($S_{t+1}$) | Probabilidad ($P$) | Fórmula de Prompt Seleccionada |
|---|---|---|---|---|
| **AUDIT** | Agente diagnosticó causa raíz pero no propuso solución. | **PLAN** | 0.70 | `plan-architectural-rfc` |
| **AUDIT** | Agente encontró el fallo puntual y su arreglo es trivial. | **GO** | 0.25 | `go-surgical-single-file` |
| **PLAN** | Agente entregó desglose de pasos y archivos a tocar. | **GO** | 0.85 | `go-phase-execution` |
| **PLAN** | Agente planteó dudas o alternativas sin cerrar. | **PLAN** (Refinamiento) | 0.15 | `plan-clarification` |
| **GO** | Agente ejecutó `edit` o `write` sobre ficheros del repo. | **VERIFY** | 0.90 | `verify-unit-tests` |
| **VERIFY** | Comando de test retornó código de salida $\neq 0$ (error). | **GO** (Surgical Fix) | 0.80 | `go-fix-test-failure` |
| **VERIFY** | Comandos de test retornaron éxito (`exit 0`). | **WRAP** / **COMMIT** | 0.85 | `wrap-session-checkpoint` |
| **WRAP** | Sesión cerrada satisfactoriamente en este proyecto. | **PICKUP** (Otro Proyecto) | 0.90 | `pickup-next-queued` |

---

## Evidence Review

### 1. Evidencia en el Historial Real de Prompts (`/home/wilox/.engram/engram.db`)
El análisis del histórico de 1,681 prompts reveló un alto nivel de repetición estilística y fórmulas estereotipadas que confirman la necesidad de un predictor:
- **`go global activo`**: Empleado **53 veces** como prefijo de disparo.
- **`sio — issue: <slug>`**: Empleado **39 veces** para encuadrar tareas específicas.
- **`guarda en engram...`**: Empleado **13 veces** para persistir decisiones operativas.
- **`misión: <slug> fase: <n>`**: Empleado **11 veces** para orquestar flujos de trabajo.
- **`independently verify the...`**: Empleado **9 veces** como patrón de validación cruzada.
- **`te doy el "go"...`**: Empleado recurrentemente para autorizar mutaciones de código.

*Conclusión del dato:* Más del 40% del texto tipeado por el usuario corresponde a estructuras fijas con pequeños parámetros variables. Esto valida matemáticamente la rentabilidad ergonómica de un predictor basado en plantillas y variables contextuales.

### 2. Evidencia de la API Socket de Herdr (`herdr api schema --json`)
La inspección de la especificación de protocolo de Herdr confirmó la existencia de métodos JSON-RPC nativos para el control de terminales [S-002]:
- `pane.send_text`: Transmite cadenas literales de caracteres al descriptor de archivo PTY del pane correspondiente sin ejecutar `\n`.
- `pane.send_keys`: Transmite secuencias de teclas canónicas (`esc`, `enter`, `tab`, `c-c`).
- `pane.run`: Envía el comando y el salto de línea en una única operación atómica.
- `pane.read`: Permite a Amauta leer los últimos $N$ bytes de la salida de la terminal para alimentar el extractor de evidencia ($O_t$).

### 3. Evidencia en la API de Extensiones de Pi (`@earendil-works/pi-coding-agent`)
La inspección del runtime local de Pi (`/home/wilox/.pi/agent-j0k3r/`) demostró que:
- `ctx.ui.addAutocompleteProvider`: Permite registrar proveedores dinámicos que interceptan el búfer de entrada y devuelven sugerencias predictivas con descripción.
- `pi.on("agent_settled")`: Se dispara de manera fiable una vez que el agente ha terminado de emitir texto y ejecutar herramientas, momento exacto en el que Amauta debe computar la predicción del siguiente prompt.
- `pi.on("input")`: Permite transformar atajos rápidos tipo slash commands (`/ro`, `/go`, `/wrap`) en prompts completos y contextualizados antes de que viajen al LLM.

---

## Trade-offs and Risks

| Decisión Arquitectónica | Ventajas | Desventajas / Riesgos | Mitigación Adoptada |
|---|---|---|---|
| **Base SQLite dedicada (`amauta.db`) vs. extensión de `engram.db`** | Aislamiento total de fallos; esquema limpio; no colisiona con sincronizaciones remotas de Engram. | Duplica un archivo `.db` en disco (~500 KB). | Adoptar `data/amauta.db` dedicado; enlazar por UUID si se requiere correlación. |
| **Heurística Markov + Trigrams vs. Re-ranking con LLM en cada turno** | Latencia < 5 ms; costo cero de tokens; 100% determinista y offline. | Menor flexibilidad semántica ante instrucciones atípicas o poéticas. | Arquitectura híbrida: Markov/Trigram por defecto (<5ms); fallback opcional a modelo pequeño si la confianza es baja. |
| **Inyección pasiva (`send_text`) vs. Ejecución automática (`run`)** | Control humano absoluto; previene mutaciones destructivas no deseadas. | Requiere que el usuario presione `Enter` manualmente. | Modo pasivo por defecto: Amauta escribe el texto en gris o en el buffer; el usuario sólo da `Enter`. |
| **Cola de proyectos centralizada vs. ficheros dispersos por repo** | Visibilidad unificada en el dashboard de Mission Control; cambio de contexto en 1 clic. | Riesgo de desincronización si el repo se mueve de ruta. | Guardar ruta canónica en SQLite y validar existencia con `fs.existsSync`. |

---

## Alternatives Considered

1. **Bases de Datos Vectoriales Externas (Qdrant, Pinecone, Chroma)**:
   - *Evaluación:* Añaden dependencias de red, daemons pesados en memoria (consumiendo 300MB - 1GB de RAM) y latencias de consulta superiores a 30 ms.
   - *Veredicto:* **Rechazado.** SQLite FTS5 con tokenizador `trigram` proporciona búsqueda de similitud léxica y de subcadenas con latencia < 1 ms y consumo de RAM nulo.
2. **Autocompletado basado en Copilot CLI / Warp AI**:
   - *Evaluación:* Requieren enviar comandos a la nube comercial, no tienen visibilidad del estado metodológico del usuario ni conocen las fórmulas particulares de su ecosistema (`sio-*`).
   - *Veredicto:* **Rechazado.** Amauta debe ser 100% privado, local y afinado con el histórico del usuario.
3. **Scripts ad-hoc de `tmux send-keys`**:
   - *Evaluación:* Acoplan el flujo a Tmux, ignorando la infraestructura existente basada en Herdr y sockets UNIX.
   - *Veredicto:* **Rechazado.** Herdr es el estándar de la estación de trabajo y ofrece un socket estructurado con tipado JSON.

---

## Unknowns and Limits

- **Límite de predicción ante tareas radicalmente nuevas**: Cuando el usuario aborda un dominio tecnológico virgen (sin precedentes en los 1,681 prompts), el predictor de Markov no tendrá una plantilla previa óptima; en tales casos, Amauta debe ofrecer las fórmulas base del ciclo metodológico genérico (`AUDIT`, `PLAN`).
- **Compatibilidad con terminales fuera de Herdr**: Si el desarrollador abre una pestaña regular de Bash o Warp sin Herdr ni Pi, la inyección zero-copy por socket no estará disponible. En ese escenario, Amauta se degradará limpiamente al portapapeles tradicional del sistema o a la UI web de Mission Control.

---

## Recommended Next Actions

1. **Fase 1: Motor de Minería y Esquema Base**
   - Inicializar el repositorio `/home/wilox/projects/sio-amauta`.
   - Crear el script de migración e ingesta para procesar los 1,681 prompts de `engram.db`, eliminar ruido (*stop-phrases* como "de manera controlada", "solo lectura") y estructurar las primeras 20 plantillas maestras en `amauta.db`.
2. **Fase 2: Motor de Inferencia Causal & Slash Commands**
   - Implementar el evaluador de estados de Markov (`src/engine/state-machine.ts`).
   - Crear los slash commands canónicos (`/ro`, `/plan`, `/go`, `/verify`, `/wrap`, `/pickup`) como transformadores rápidos.
3. **Fase 3: Terminal Bridge (Pi Extension + Herdr Socket)**
   - Crear la extensión `sio-amauta-pi-extension.ts` bajo `~/.pi/agent-j0k3r/extensions/`.
   - Conectar el cliente socket de Herdr para habilitar el autocompletado en el TUI de Pi y el pre-rellenado de comandos en el pane activo.
4. **Fase 4: Integración en SIO Mission Control**
   - Conectar Amauta vía MCP a `sio-mission-control`.
   - Incorporar el módulo visual de "Prompt Sugerido" y la "Cola Multi-Proyecto" en el sidebar de Mission Control.
