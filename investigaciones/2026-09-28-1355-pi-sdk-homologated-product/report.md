# Arquitectura y Viabilidad: Producto Homologado SIO Agent basado en j0k3r-pi y Pi SDK (`pi.dev`)

## Resumen Ejecutivo

Esta investigación técnica analiza la viabilidad, diseño arquitectural y estrategia de empaquetado para convertir el ecosistema actual de **`j0k3r-pi`** (orquestador, agentes, subagentes especializados, catálogo de skills, extensiones avanzadas) y el nuevo módulo de memoria e inyección inteligente **`sio-amauta`** en un **producto homologado, autónomo y distribuible** utilizando el **Pi SDK oficial (`@earendil-works/pi-coding-agent`)** de `pi.dev`.

### Conclusiones Principales:
1. **Factibilidad Total (100% Viable)**: El paquete oficial `@earendil-works/pi-coding-agent` está publicado bajo licencia ultra-permisiva **MIT** [S-008]. No impone restricciones de redistribución, permite integración *in-process*, branding propio y comercialización sin royalties.
2. **Capacidades Nativas del SDK**: El SDK expone la API fundamental `createAgentSession` [S-001] que permite instanciar el runtime de Pi programáticamente en Node.js/Bun con control absoluto sobre:
   - Cargador de recursos (`ResourceLoader`), permitiendo compilar o embeber subagentes y skills sin depender de carpetas descubiertas en el disco.
   - Entorno de configuración (`SettingsManager.inMemory()` o por archivo centralizado).
   - Gestión de sesiones (`SessionManager` persistente o efímero).
   - Inyección de prompts de sistema dinámicos y herramientas a la medida (`tools`, `customTools`).
3. **Validación en Producción Preexistente**: Ya contamos con una implementación de referencia en nuestro propio entorno: `pi-subagents-j0k3r` [S-007], el cual usa el Pi SDK en caliente para spawnear sesiones anidadas, aislar extensiones (`isolateSubagentExtensions`) y coordinar subagentes en background.
4. **Homologación con `sio-amauta`**: `sio-amauta` encaja de forma natural como una extensión nativa y un servicio MCP/IPC embebido dentro del binario del producto, proporcionando fórmulas de prompt predecibles, comandos (`/ro`, `/go`, `/wrap`, `/pickup`), memoria semántica SQLite FTS5 e inyección de terminal sin requerir plugins externos [S-010].
5. **Estrategia Recomendada (Anti-Sobreingeniería)**:
   - **Formato Núcleo**: Un paquete monorepo/appliance TypeScript empaquetable como CLI ejecutable (`sio-agent`) vía Bun/Node o contenedor Docker para despliegue empresarial.
   - **Evitar reescribir el agente**: Reutilizar el runtime probado de Pi como motor de ejecución (*engine*) y construir sobre él la capa de valor propietaria SIO (Orquestador + Subagentes + Amauta + UI SIO).

---

## Pregunta de Investigación

> ¿Cómo tomar una copia/distribución de `j0k3r-pi` (orquestador, agentes, subagentes, skills, extensiones) combinada con `sio-amauta`, y construir un producto o distribución homologada, empaquetada e independiente usando las capacidades oficiales del SDK de Pi (`pi.dev`)?

---

## Recomendación y Hoja de Ruta

Se recomienda formalizar el producto bajo la denominación técnica **`SIO Agent Core`** (o **`sio-agent`**), estructurado como una distribución verticalizada de Pi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SIO AGENT PRODUCT (CLI / TUI)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. SIO BRANDING & CLI ENTRY POINT (`bin/sio-agent`)                   │
│    - CLI unificada: `sio-agent`, flags corporativos, perfiles           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. SIO AMAUTA COGNITIVE CORE (`@sio/amauta`)                           │
│    - Banco FTS5 de prompts probados (`/ro`, `/go`, `/wrap`, `/pickup`)  │
│    - Inyección Zero-Copy a terminal activa (Herdr socket / Unix pipe)   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. SIO SUBAGENTS HARNESS (`@sio/subagents`)                           │
│    - Multi-agente con SDK Runner: discovery, planning, apply, verify   │
│    - Deep Researcher + News Researcher integrados                       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. PI CORE SDK ENGINE (`@earendil-works/pi-coding-agent` v0.87+)        │
│    - `createAgentSession()` + `SessionManager` + `DefaultResourceLoader` │
│    - TUI interactivo (@earendil-works/pi-tui) o modo Headless / RPC      │
└────────────────────────────────────────────────────────────────────────┘
```

### Plan de 3 Fases:
- **Fase 1 (Empaquetado Package SIO)**: Crear un meta-paquete Pi (`sio-pack`) usando la especificación oficial de paquetes [S-003] que consolide extensiones, skills y subagentes en un solo artefacto versionado.
- **Fase 2 (Harness Binario Standalone con SDK)**: Crear un ejecutable Node/Bun con `createAgentSession` [S-001] que arranque el entorno con el tema, agentes y Amauta pre-cableados sin requerir configuración manual de `~/.pi`.
- **Fase 3 (Integración SIO Mission Control)**: Conectar el producto por RPC/WebSocket con la interfaz web de SIO Mission Control para supervisión y telemetría de misiones.

---

## Hallazgos Clave

### 1. El SDK Oficial de Pi (`@earendil-works/pi-coding-agent`)

El SDK exportado por Pi no es un wrapper superficial; es la arquitectura misma sobre la que está construido el ejecutable de línea de comandos [S-001, S-008]:

| Módulo / Capacidad | Descripción Técnica en Pi SDK | Beneficio para Producto Homologado |
|---|---|---|
| `createAgentSession(options)` | Instanciador in-process de un agente completo con ciclo de vida, historial y herramientas. | Permite lanzar el agente dentro de cualquier backend (Express, Fastify, CLI custom, Desktop app). |
| `ResourceLoader` | Interfaz que define de dónde se cargan extensiones, prompts, temas y skills. | Permite **empaquetar los agentes y skills en el binario/bundle**, eliminando la necesidad de leer archivos sueltos de `~/.pi`. |
| `SessionManager` | Motor transaccional del árbol de mensajes JSONL y compactación de contexto. | Permite almacenar sesiones en bases de datos personalizadas o carpetas protegidas (`/var/lib/sio/sessions`). |
| `ModelRuntime` | Abstracción de modelos y autenticación (OAuth, API Keys, proxies). | Integración directa con proxies corporativos (`cliproxyapi`, Ollama, endpoints locales). |
| `AgentSessionRuntime` | Gestor multisesión (`newSession`, `switchSession`, `fork`). | Habilita conmutación de proyectos y multi-tarea desde una sola instancia. |

### 2. Arquitectura de Clonación de `j0k3r-pi`

Actualmente, `j0k3r-pi` reside como una configuración de usuario local [S-009]:
- `subagents/`: Definiciones Markdown de los subagentes (`00-discovery.md`, `01-planning.md`, `02-apply.md`, `03-verify.md`, `deep-researcher.md`).
- `extensions/`: Extensiones TypeScript (`workspace-services`, `tools-manager`, `typesafe`, `codegraph`, `browser-screenshot`, etc.).
- `skills/`: Habilidades activables bajo demanda (`anti-overengineering`, `cognitive-doc-design`, `tdd`).
- `npm/node_modules/pi-subagents-j0k3r`: El motor de concurrencia y ejecución de subagentes [S-007].

En un **producto homologado**, estos elementos se desacoplan del directorio de usuario personal (`~/.pi/agent-j0k3r/`) y se empaquetan en un artefacto unificado:

```
sio-agent-product/
├── package.json               # Depende de @earendil-works/pi-coding-agent
├── bin/
│   └── sio-agent.ts           # Punto de entrada CLI homologado
├── src/
│   ├── engine.ts              # Invocación de createAgentSession con ResourceLoader cerrado
│   ├── amauta/                # Motor SIO Amauta (FTS5 + IPC Terminal)
│   ├── subagents/             # Subagentes integrados como assets o código
│   ├── skills/                # Skills embebidos
│   └── extensions/            # Extensiones SIO preconfiguradas
└── themes/
    └── sio-dark.json          # Tema visual corporativo
```

### 3. Mecanismos de Integración en el Pi SDK

#### A. Inyección de Recursos vía `ResourceLoader` Personalizado
A diferencia del CLI estándar que rastrea el disco (`~/.pi/agent/`), un producto homologado puede proveer su propio `ResourceLoader` [S-001, S-006]:
```typescript
import { createAgentSession, ResourceLoader } from "@earendil-works/pi-coding-agent";

class SioResourceLoader implements ResourceLoader {
  getSystemPrompt() {
    return "Eres SIO Agent, el asistente de ingeniería oficial de SIO Ecosystem...";
  }
  getSkills() {
    // Retorna las skills de SIO compiladas en memoria
    return { skills: SIO_BUILTIN_SKILLS, diagnostics: [] };
  }
  getExtensions() {
    // Retorna las extensiones de j0k3r y amauta directamente
    return { extensions: SIO_EXTENSIONS, errors: [], runtime: sioExtensionRuntime };
  }
  // ... resto de la interfaz (temas, prompts, context files)
}
```
Esto garantiza que **el cliente final o el entorno de despliegue no pueda alterar ni corromper las directivas base ni los subagentes**.

#### B. Integración de `sio-amauta`
`sio-amauta` [S-010] se integra mediante dos puntos de contacto del SDK [S-002]:
1. **Comandos de Slash (`pi.registerCommand`)**: Registra `/ro` (solo lectura), `/go` (autorización quirúrgica), `/wrap` (resumen de cierre) y `/pickup` (recuperación de proyecto).
2. **Hook de Ciclo de Vida (`before_agent_start`)**: Evalúa el prompt entrante, detecta variables del entorno (`[PROYECTO]`, `[RAMA]`) y las sustituye en vivo.
3. **Herramienta `amauta_query` (`pi.registerTool`)**: Permite al modelo consultar el banco de conocimiento histórico de soluciones exitosas sin salir del proceso.

---

## Revisión de Evidencia Técnica

### 1. Licencia y Legalidad
- **Evidencia**: Inspección directa de `package.json` [S-008]:
  `"license": "MIT"`
- **Interpretación**: MIT otorga derechos explícitos para usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del software. No contiene cláusulas Copyleft restrictivas (como GPL o AGPL), por lo que empaquetar una solución comercial/propiedad de SIO que use el SDK es 100% legal y estándar en la industria.

### 2. Viabilidad Demostrada en el Código Existente
- **Evidencia**: En `pi-subagents-j0k3r` (`sdk-runner.ts`) [S-007]:
  ```typescript
  const created = await createAgentSession({
    cwd,
    model,
    thinkingLevel: effort,
    tools,
    sessionManager,
    resourceLoader: new DefaultResourceLoader({
      cwd,
      systemPromptOverride: () => systemPrompt,
      extensionsOverride: isolateSubagentExtensions,
    })
  });
  ```
- **Interpretación**: Ya tenemos probado en nuestra máquina que el SDK soporta la orquestación recursiva de agentes con prompts propios, aislamiento de extensiones y herramientas restringidas sin interferencia entre tareas.

### 3. Modos de Ejecución Disponibles en el SDK
El ecosistema de Pi ofrece dos modelos operativos fundamentales [S-001, S-004]:
- **Modo In-Process (SDK puro)**: El proceso Node/Bun del producto aloja la instancia del agente. Latencia cero, acceso a memoria directa, ideal para CLI dedicada o servidor Express con WebSockets.
- **Modo Out-of-Process (RPC Subprocess Daemon)**: El agente corre como subproceso aislado comunicándose por JSONL en stdin/stdout (`pi --mode rpc`). Ideal si se desea desacoplar el agente en contenedores independientes o comunicarse desde lenguajes no-JS (Go, Rust, Python) [S-004].

---

## Compensaciones y Riesgos (Trade-offs)

| Dimensión | Opción A: Pi Package (`sio-pack`) | Opción B: Standalone Appliance CLI (`sio-agent`) | Opción C: Microservicio RPC / Docker |
|---|---|---|---|
| **Definición** | Distribuir como paquete instalable con `pi install npm:@sio/pack`. | Crear binario ejecutable propio que envuelve el Pi SDK. | Servicio contenedorizado accesible vía JSON-RPC / API REST. |
| **Ventajas** | - Cero mantenimiento del CLI.<br>- Actualizaciones inmediatas vía `pi update`. | - Branding 100% SIO.<br>- Inmune a configuraciones del usuario.<br>- Experiencia llave en mano. | - Máximo aislamiento.<br>- Ideal para despliegues en servidores o Kubernetes. |
| **Desventajas** | - Requiere que el usuario tenga instalado `pi`.<br>- El usuario puede alterar flags. | - Requiere mantener el empaquetado del CLI propio.<br>- Gestión de binarios. | - Sobrecarga operativa si solo se busca uso local en la terminal. |
| **Complejidad** | Mínima (1-2 días). | Media (3-5 días). | Alta (1-2 semanas). |

### Riesgos Identificados:
1. **Actualizaciones de la API del SDK**: `@earendil-works/pi-coding-agent` está en versión `0.87.1` [S-008]. Aunque la API principal (`createAgentSession`) es madura, cambios en versiones menores podrían impactar firmas internas.
   - *Mitigación*: Fijar la dependencia con versión exacta en `package.json` (`"0.87.1"` sin `^` ni `~`).
2. **Consumo de Memoria en Multi-Agente**: Ejecutar múltiples instancias de `createAgentSession` simultáneamente en Node.js consume memoria (~150MB por sesión activa con buffers grandes).
   - *Mitigación*: Utilizar el patrón `session_resources: "lean"` ya implementado en `subagents.json` [S-007], que deshabilita skills y context files redundantes en sesiones esclavas.

---

## Alternativas Consideradas

1. **Bifurcar (Fork) el repositorio completo de Pi**:
   - *Descartado*: Mantener un fork de todo el repositorio de Pi implica un alto costo de mantenimiento, resolver conflictos de sincronización upstream y riesgo de obsolescencia.
2. **Construir un Agente desde Cero (sin Pi SDK)**:
   - *Descartado por Violación del principio Anti-Overengineering*: Pi ya resuelve de forma óptima el árbol de turnos, el streaming con backpressure, soporte multi-proveedor (OpenAI, Anthropic, Gemini, Ollama), compactación de contexto inteligente y manejo de terminales ANSI.
3. **Distribución vía Pi Package Homologado (Recomendación Inmediata)**:
   - *Aceptado*: Permite aprovechar el 100% de la infraestructura de Pi distribuyendo la configuración de SIO (`j0k3r-pi` + subagentes + `sio-amauta`) de forma modular y limpia.

---

## Incógnitas y Límites

- **Soporte Bun Single-File Binary**: Si se desea compilar a un ejecutable binario único autónomo (`bun build --compile`), se debe verificar la compatibilidad de dependencias nativas como `@vscode/ripgrep` o módulos C++ que Pi utiliza para la búsqueda de archivos.
- **Acceso a Modelos sin Proxy**: El producto homologado asume que el usuario dispondrá de sus propias API Keys en `auth.json` o que se conectará a un backend centralizado como `cliproxyapi` corporativo.

---

## Acciones Siguientes Recomendadas

1. **Paso 1: Estructurar el Repositorio Monorepo de SIO Agent**:
   Crear un directorio `packages/sio-agent` dentro de la suite SIO con su respectivo `package.json` que enlace `@earendil-works/pi-coding-agent` como motor.
2. **Paso 2: Consolidar Subagentes y Extensiones en `@sio/core`**:
   Mover las definiciones de `subagents/` y las extensiones clave de `agent-j0k3r` a módulos TypeScript reutilizables.
3. **Paso 3: Integrar `sio-amauta` como Extensión Core**:
   Empaquetar el motor de prompts y conexión Herdr dentro del ciclo de vida del agente.
4. **Paso 4: Validar Lanzamiento con `createAgentSession`**:
   Crear un script de prueba de concepto que lance una sesión completa con todos los componentes pre-cargados en menos de 50 líneas de código.
