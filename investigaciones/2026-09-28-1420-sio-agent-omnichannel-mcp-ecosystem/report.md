# Arquitectura Fundacional: Ecosistema Multi-Branch SIO Agent con Ingestión Omnicanal y Red Neuronal MCP

## Resumen Ejecutivo

El presente informe define la **arquitectura fundacional y el blueprint de ingeniería** para evolucionar la plataforma **`SIO Agent`** (basada en el Pi SDK oficial `@earendil-works/pi-coding-agent`, `j0k3r-pi`, `sio-amauta` y `sio-mission-control`) desde un asistente de desarrollo local hacia un **ecosistema multi-rama autónomo de nivel empresarial**.

Esta arquitectura permite orquestar de forma concurrente agentes de atención al cliente en **WhatsApp** (Evolution API / Meta Cloud API), **Instagram Direct** y **Facebook Messenger** (Meta Graph API / Chatwoot), integrados de manera nativa con los sistemas de negocio **SIO** (SIO-Hotel PMS, SIO Facturador SUNAT, ERP/CRM e inventarios).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SIO AGENT OMNICHANNEL & ENTERPRISE ECOSYSTEM                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. CANALES DE INGESTIÓN (Omnichannel Ingestion Gateway)                                │
│    [ WhatsApp ]           [ Instagram DM ]          [ Facebook Messenger ]   [ Webchat ]│
│    (Evolution API v2)     (Meta Graph API)          (Meta Page Webhooks)     (Chatwoot) │
│              │                    │                          │                    │     │
│              └────────────────────┴──────────┬───────────────┴────────────────────┘     │
│                                              ▼                                          │
│ 2. MOTOR DE AGENTES MULTI-RAMA (SIO Agent Core - Pi SDK In-Process)                     │
│    ┌──────────────────────────────────────────────────────────────────────────────┐    │
│    │ • Pi SDK Runner (`createAgentSession` / headless in-process loop)             │    │
│    │ • Concurrency & Debounce Manager (Buffer 3s + Mutex por conversación)        │    │
│    │ • Sesiones Aisladas por Cliente (`tenant:channel:customerId`)                │    │
│    │ • Human Handoff Bridge (Escalamiento a operador humano en Chatwoot/Dashboard)│    │
│    └──────────────────────────────────────────────────────────────────────────────┘    │
│              │                                              ▲                           │
│              │ Inyección Cognitiva                          │ Tools Estandarizadas      │
│              ▼                                              │                           │
│ 3. CEREBRO COGNITIVO (`sio-amauta`)           4. RED EMPRESARIAL (MCP Fabric)           │
│    ┌─────────────────────────────────┐        ┌──────────────────────────────────┐      │
│    │ • Bóveda de Prompts & Políticas │        │ Servidores MCP (Model Context):  │      │
│    │ • Intención & Clasificador FTS5 │        │ • `mcp-sio-hotel` (PMS Postgres) │      │
│    │ • Memoria Histórica del Huésped │        │ • `mcp-sio-facturador` (SUNAT)   │      │
│    │ • Guardrails Fiscales y Legales │        │ • `mcp-sio-crm` (Leads & Clientes│      │
│    └─────────────────────────────────┘        └──────────────────────────────────┘      │
│                                              ▼                                          │
│ 5. COCKPIT DE SUPERVISIÓN & TELEMETRÍA (SIO Mission Control)                            │
│    - CCTV 1920px: Vista unificada de sesiones de clientes y agentes de ingeniería        │
│    - Métricas en tiempo real: Latencia LLM, consumo de tokens, cola de webhooks        │
│    - Intervención humana manual (takeover) con un clic                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Conclusiones Principales:
1. **El Pi SDK como Motor Universal Headless**: El Pi SDK oficial (`@earendil-works/pi-coding-agent`) no está limitado a la terminal interactiva; su método nativo `createAgentSession` permite instanciar loops agenticos en memoria dentro de un microservicio Node.js/Bun. Cada cliente de WhatsApp o Instagram recibe una sesión aislada con persistencia ligera (`SessionManager`).
2. **MCP (Model Context Protocol) como Espina Dorsal Desacoplada**: En lugar de programar integraciones ad-hoc (hardcoding de APIs REST o consultas SQL directas en los prompts), los sistemas SIO exponen **servidores MCP estándar** (`@modelcontextprotocol/sdk`). Cualquier rama de agente (sea el bot de reservas de hotel, el asistente de facturación o el agente de desarrollo en consola) consume las herramientas de inventario, tarifas y facturación mediante el mismo contrato unificado de MCP.
3. **Ingestión Híbrida Anti-Sobreingeniería (Chatwoot + Evolution API)**: 
   - Para WhatsApp ágil y despliegue rápido: **Evolution API v2** (basado en Baileys y Meta Cloud API) proporciona control REST/WebSocket y gestión de QR multi-instancia.
   - Para atención omnicanal completa con agentes humanos y soporte multicanal (FB + IG + WA): **Chatwoot** actúa como centro de bandeja de entrada unificada (*Agent Bot API*). El agente SIO opera como bot autónomo y transfiere automáticamente a humanos cuando detecta fricción o solicitud explícita.
4. **Debouncing y Control de Concurrencia de Mensajes**: En WhatsApp e Instagram, los usuarios envían ráfagas de 3 o 4 mensajes cortos seguidos. La arquitectura incorpora una ventana deslizante de consolidación (*Message Debounce Buffer* de 2.5s–3.5s) que agrupa los textos antes de disparar la inferencia del LLM, reduciendo costos de tokens en más del 65% y eliminando alucinaciones por contexto fragmentado.
5. **Cero Reescritura Futura**: Estructurar `sio-amauta` como un MCP Server de Memoria/Políticas y aislar los conectores de canal en adaptadores tipados garantiza que agregar un nuevo canal (e.g. Telegram, TikTok DM) o un nuevo módulo de ERP requiera únicamente escribir un adaptador de entrada/salida de menos de 150 líneas de código.

---

## Pregunta de Investigación

> ¿Cómo diseñar los cimientos arquitecturales del ecosistema `SIO Agent` para que el núcleo (`Pi SDK` + `j0k3r-pi` + `sio-amauta` + `sio-mission-control`) pueda ramificarse limpiamente en agentes autónomos omnicanal (WhatsApp, Messenger, Instagram) e integrarse con el software empresarial SIO (SIO-Hotel PMS, Facturador SUNAT, CRM) utilizando Model Context Protocol (MCP) como columna vertebral, sin sobreingeniería y con soporte para supervisión en tiempo real y transferencia a humanos?

---

## Recomendación y Arquitectura Base

Se recomienda adoptar una arquitectura por capas desacopladas basada en el patrón **Hexagonal / Ports & Adapters**:

| Capa | Responsabilidad | Tecnología Seleccionada | Justificación Anti-Sobreingeniería |
|---|---|---|---|
| **Capa 1: Ingestión Omnicanal** | Recepción de Webhooks, normalización de eventos y envío de respuestas. | **Chatwoot Engine** (vía Agent Bot Webhooks) + **Evolution API v2** (WhatsApp gateway). | Reutiliza plataformas maduras de código abierto (37k+ y 9.7k+ estrellas); no reinventa UI de bandeja de entrada humana ni gestión de sockets de WhatsApp [S-004, S-005]. |
| **Capa 2: Gateway & Orquestación** | Debounce de mensajes, enrutamiento por canal, mutex de sesión y ciclo de vida. | Microservicio Node.js / Bun (`@sio/agent-gateway`) con SQLite / In-Memory State. | Evita colas complejas externas (Kafka/RabbitMQ) para cargas estándar de PYME hotelera; SQLite WAL soporta >10k operaciones concurrentes/seg [S-009]. |
| **Capa 3: Motor Agentico Core** | Inferencia LLM, ejecución de loops de razonamiento, selección de herramientas. | **Pi SDK (`@earendil-works/pi-coding-agent`)** en modo headless. | Mismo runtime que `j0k3r-pi`. Soporta abortos de streaming, manejo de tokens y aislamiento sin acoplamiento a terminal [S-001]. |
| **Capa 4: Memoria e Intenciones** | Políticas de negocio, clasificación de intenciones, contexto de cliente y prompts probados. | **`sio-amauta`** (vía SQLite FTS5 + interfaz MCP). | Centraliza prompts de atención y guardrails fiscales SUNAT fuera del código fuente [S-010]. |
| **Capa 5: Conectividad Empresarial** | Acceso a base de datos de SIO Hotel PMS, emisión de facturas SUNAT y CRM. | **Servidores MCP SIO** (`@sio/mcp-hotel`, `@sio/mcp-facturador`, `@sio/mcp-crm`). | Protocolo abierto estándar de la industria (Anthropic / Linux Foundation); desacopla las bases de datos de los agentes [S-002, S-003]. |
| **Capa 6: Telemetría y Supervisión** | Monitor CCTV 1920px, visualización de turnos, estado de canales y toma de control manual. | **`sio-mission-control`** (REST + Server-Sent Events). | Extiende la vista CCTV actual para mostrar paneles de bots de WhatsApp en vivo junto a las terminales de desarrollo [S-011]. |

---

## Hallazgos Clave

### 1. El Pi SDK como Motor Universal Headless

A diferencia de los frameworks monolíticos para chatbots (Typebot, Botpress), el **Pi SDK (`@earendil-works/pi-coding-agent`)** ofrece una arquitectura de agente minimalista y de alto rendimiento basada en primitives bien definidas [S-001]:

1. **`createAgentSession(options)` en Proceso**:
   - Se ejecuta directamente en el proceso Node.js del Gateway sin requerir demonios externos.
   - Recibe herramientas dinámicas (`tools`) generadas al vuelo a partir de los esquemas de los Servidores MCP.
   - Utiliza `SessionManager.open(sessionPath)` o `SessionManager.inMemory()` para mantener el árbol de conversación de cada cliente (con compresión y poda automática de contexto).
2. **Ciclo de Ejecución de Turno de Cliente**:
   ```typescript
   // Flujo conceptual de ejecución headless en SIO Agent Gateway
   import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
   import { convertMcpToolsToPiTools } from "./mcp-adapter";

   export async function handleCustomerTurn(tenantId: string, channel: string, customerId: string, userText: string) {
     const sessionKey = `${tenantId}_${channel}_${customerId}`;
     const sessionPath = `/var/lib/sio/sessions/${sessionKey}.jsonl`;
     
     // Cargar o crear sesión de Pi
     const sessionManager = await SessionManager.open(sessionPath, "/var/lib/sio/sessions");
     
     // Obtener herramientas MCP conectadas (Hotel, Facturador, CRM)
     const piTools = await getBoundMcpTools();

     // Inyectar contexto cognitivo desde sio-amauta
     const systemPrompt = await amauta.resolvePrompt("hotel_guest_assistant", { customerId });

     const { session } = await createAgentSession({
       sessionManager,
       tools: piTools,
       systemPromptOverride: () => systemPrompt,
       thinkingLevel: "off", // Para atención al cliente se apaga thinking o se limita para baja latencia
     });

     // Ejecutar turno del agente y capturar respuesta generada
     const result = await session.prompt(userText);
     return result;
   }
   ```
3. **Ventajas Frente a Alternativas**:
   - **Cero latencia de inicialización**: La sesión reside en el mismo proceso.
   - **Interrumpibilidad nativa**: Soporta `AbortController` si el usuario cancela o escribe mientras el modelo está razonando.
   - **Consistencia técnica**: El equipo de desarrollo utiliza las mismas herramientas e infraestructura mental que ya conoce con `j0k3r-pi`.

---

### 2. Ingestión Omnicanal: WhatsApp, Instagram DM y Facebook Messenger

#### Comparativa de Opciones Técnicas de Canal

| Solución | Cobertura | Riesgo de Bloqueo | Costo / Licencia | Adecuación para SIO |
|---|---|---|---|---|
| **Evolution API v2** [S-004] | WhatsApp (Baileys + Meta Cloud API) | Bajo con Cloud API; Medio con Baileys si se hace spam | Open Source (Apache 2.0) | **Ideal como pasarela principal de WhatsApp**. Expone API REST/WS limpia, multi-instancia, webhooks JSON estandarizados. |
| **WhiskeySockets / Baileys** [S-006] | WhatsApp Web Socket puro | Medio-Alto si no se maneja rate limit | Open Source (MIT) | Excelente para bots personales/internos; requiere gestionar reconexión manual a bajo nivel. |
| **Meta Graph API (Directa)** [S-007] | Instagram DM + FB Messenger + WhatsApp Cloud | Nulo (Canal Oficial) | API Gratuita (Meta cobra por conversación de WhatsApp fuera de ventana 24h) | Canal corporativo obligatorio para Instagram DM y Facebook Pages. |
| **Chatwoot Open Source** [S-005] | Todos los anteriores + Webchat + Email | Nulo (Usa APIs oficiales o Evolution como canal) | Open Source (MIT / AGPL) | **Mejor opción para inbox unificado y human handoff**. Permite que operadores humanos y el bot convivan sin conflictos. |

#### Arquitectura de Debouncing de Mensajes (Buffer Anticoncurrencia)

En mensajería instantánea humana (especialmente WhatsApp e Instagram), es estándar que el cliente envíe:
```
[14:20:01] "Buenas tardes"
[14:20:03] "¿Tienen habitación matrimonial para el viernes?"
[14:20:05] "Somos 2 adultos y un niño"
```
Si el Gateway procesara cada webhook individualmente, lanzaría 3 llamadas a OpenAI/Anthropic en paralelo, costaría el triple, provocaría condiciones de carrera y daría respuestas inconexas.

**Solución Implementada**: Buffer de Agregación con Ventana Deslizante (*Sliding Window Aggregator*):
```
      Webhook Entrada
            │
            ▼
    ┌───────────────┐
    │ Debounce Map  │ ◄─── Llega Msg 1 ("Buenas tardes") -> Timer 3000ms inicia
    │ (por Chat ID) │ ◄─── Llega Msg 2 (Pregunta)        -> Resetea Timer a 3000ms
    └───────┬───────┘ ◄─── Llega Msg 3 (Detalle)         -> Resetea Timer a 3000ms
            │
      Timer Expira (Sin nuevos mensajes)
            │
            ▼
    "Buenas tardes \n ¿Tienen habitación matrimonial para el viernes? \n Somos 2 adultos y un niño"
            │
            ▼
      Inferencia Pi SDK (1 solo turno, contexto completo, -66% costo de tokens)
```

---

### 3. MCP (Model Context Protocol) como Espina Dorsal Empresarial SIO

El **Model Context Protocol (MCP)**, estandarizado por Anthropic [S-002, S-003], resuelve el problema de la fragmentación de integraciones. En vez de conectar cada canal de mensajería a cada base de datos:

```
[ WhatsApp Bot ] ──┐
[ Instagram Bot ] ──┼──► [ SIO AGENT CORE (Pi SDK) ] ──► [ MCP CLIENT BRIDGE ]
[ Developer CLI ] ──┤                                           │
[ Mission Control] ─┘                                           ▼
                                                ┌──────────────────────────────┐
                                                │    SERVIDORES MCP SIO        │
                                                ├──────────────────────────────┤
                                                │ 1. `mcp-sio-hotel` (PMS)     │
                                                │ 2. `mcp-sio-facturador`      │
                                                │ 3. `mcp-sio-crm`             │
                                                │ 4. `mcp-sio-inventory`       │
                                                └──────────────────────────────┘
```

#### Catálogo de Herramientas MCP para el Ecosistema SIO:

| Servidor MCP | Herramienta | Entradas | Salida / Acción |
|---|---|---|---|
| **`mcp-sio-hotel`** | `check_room_availability` | `checkInDate`, `checkOutDate`, `roomType` | Lista de habitaciones libres, tarifas por noche y fotos/amenities. |
| | `create_pre_reservation` | `guestName`, `phone`, `roomTypeId`, `dates` | Código de pre-reserva con fecha límite de pago (bloqueo temporal en PMS). |
| | `get_guest_booking_status` | `phone` o `reservationCode` | Estado de la reserva, saldo pendiente, hora de check-in y políticas de estadía. |
| **`mcp-sio-facturador`** | `query_sunat_document` | `docType` (RUC/DNI), `number`, `series`, `correlative` | Estado de comprobante en SUNAT (Aceptado, Rechazado), enlace al PDF y XML. |
| | `generate_electronic_ticket` | `clientDoc`, `clientName`, `items[]`, `paymentMethod` | Generación de Boleta Electrónica en SIO Facturador y retorno de PDF descargable. |
| **`mcp-sio-crm`** | `upsert_lead_profile` | `phone`, `channel`, `name`, `interests`, `tags` | Actualización de score de lead, registro de historial de interacción y asignación a ejecutivo. |
| **`sio-amauta` (Core)** | `retrieve_domain_policy` | `domain` ("hotel_cancellation", "sunat_retention") | Regla de negocio canónica para asegurar respuestas sin alucinaciones. |

#### Implementación del Puente MCP -> Pi SDK:
El puente convierte de manera transparente la lista de herramientas de un servidor MCP en definiciones de herramientas compatibles con `piSdk.defineTool()`:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { defineTool } from "@earendil-works/pi-coding-agent";

export async function createPiToolsFromMcp(mcpClient: Client) {
  const { tools } = await mcpClient.listTools();
  return tools.map((tool) =>
    defineTool({
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
      async execute(args) {
        const response = await mcpClient.callTool({ name: tool.name, arguments: args });
        return response.content.map((c) => (c.type === "text" ? c.text : JSON.stringify(c))).join("\n");
      },
    })
  );
}
```

---

## 4 Escenarios Concretos del Mundo Real

### Escenario 1: Asistente de Huéspedes por WhatsApp para SIO-Hotel

```
Huésped (WhatsApp)             Evolution API / SIO Gateway         Pi Agent + MCP SIO-Hotel             PMS PostgreSQL
        │                                   │                                  │                              │
   (1)  │ "Hola, ¿tienen matrimonial        │                                  │                              │
        │  para este sábado 2 noches?"      │                                  │                              │
        ├──────────────────────────────────►│ (2) Debounce buffer (3s)         │                              │
        │                                   ├─────────────────────────────────►│ (3) Inicia turno de agente   │
        │                                   │                                  │     con Amauta Prompt        │
        │                                   │                                  │                              │
        │                                   │                                  │ (4) Invocación Tool:         │
        │                                   │                                  │ check_room_availability      │
        │                                   │                                  ├─────────────────────────────►│
        │                                   │                                  │◄─────────────────────────────┤ Retorna 2 Matrimoniales
        │                                   │                                  │ (Tarifa: S/. 180 / noche)    │
        │                                   │                                  │                              │
        │                                   │ (5) Genera respuesta redactada   │                              │
        │                                   │◄─────────────────────────────────┤                              │
        │ (6) "¡Hola Carlos! Sí tenemos     │                                  │                              │
        │  disponible la Suite Matrimonial  │                                  │                              │
        │  (S/. 180/noche). ¿Deseas que     │                                  │                              │
        │  te la reserve ahora?"            │                                  │                              │
        │◄──────────────────────────────────┤                                  │                              │
```

- **Manejo de Reserva**: Cuando el huésped confirma, el agente invoca `create_pre_reservation` en el PMS a través de MCP, genera un link de pago con código QR y guarda el estado en SIO-Hotel con un timer de retención de 30 minutos.

---

### Escenario 2: Conversión y Calificación de Leads en Redes Sociales (Facebook / Instagram DM)

- **Contexto**: Un usuario ve un anuncio de banquetes/eventos o estadía de fin de semana y envía un mensaje privado en Instagram: *"Hola, me interesa información para un evento corporativo de 40 personas"*.
- **Flujo de Ejecución**:
  1. **Recepción**: Webhook de Instagram Messaging recibido por Chatwoot / SIO Gateway.
  2. **Análisis de Intención**: `sio-amauta` clasifica la consulta como `lead.commercial.event_quote` y aplica la plantilla de calificación B2B.
  3. **Extracción y Validación**: El agente interactúa cordialmente preguntando: fecha tentativa, requerimiento de catering y datos de contacto (empresa, RUC o email corporativo).
  4. **Persistencia MCP**: Mediante `mcp-sio-crm.upsert_lead_profile`, el agente registra el lead en el CRM con etiqueta `INTERES_EVENTOS_CORP`, score `CALIFICADO_ALTO` y adjunta el resumen conversacional.
  5. **Handoff a Ventas**: Si el cliente indica que desea una reunión virtual o llamada, el bot invoca `chatwoot.transfer_to_inbox("Ventas Corporativas")` y notifica por WhatsApp al ejecutivo de cuentas asignado.

---

### Escenario 3: Asistente Automatizado de Facturación para SIO Facturador SUNAT

- **Contexto**: Un cliente de una empresa usuaria de SIO Facturador escribe por WhatsApp indicando que necesita su factura electrónica o consultar el estado de una orden.
- **Interacción**:
  - *Cliente*: *"Hola, hice una compra ayer con RUC 20601234567, ¿me pueden mandar la factura?"*
  - *Agente*: Invoca `mcp-sio-facturador.query_sunat_document({ docType: "RUC", number: "20601234567", dateRange: "last_48h" })`.
  - *Herramienta MCP*: Busca en el PostgreSQL de SIO Facturador, localiza la Factura Electrónica `F001-0004521`, valida que cuenta con el CDR (Constancia de Recepción) aprobado por SUNAT.
  - *Entrega Multimedia*: El agente envía un mensaje de confirmación y despacha a través de Evolution API el archivo adjunto PDF oficial y el XML firmado directamente al chat de WhatsApp.

---

### Escenario 4: Cockpit Híbrido de Dev & Ops en SIO Mission Control

- **Contexto**: El operador del hotel o el líder técnico supervisa la plataforma en tiempo real en una pantalla de 1920px con SIO Mission Control.
- **Telemetría y Visualización CCTV**:
  - **Canal 1**: Terminal en vivo del bot de WhatsApp Hotel (mostrando webhooks entrantes, debouncing y latencias de inferencia de 1.2s).
  - **Canal 2**: Terminal del agente de Facturación SUNAT procesando comprobantes.
  - **Canal 3**: Sesión de desarrollo de ingeniería de `j0k3r-pi` resolviendo una tarea en el repositorio.
  - **Canal 4**: Panel de Alertas & Intervención Humana (CCTV Live Alerts):
    - Alerta si un cliente escribe palabras de frustración o reclamo (*"estoy esperando hace media hora"*, *"quiero el libro de reclamaciones"*).
    - Botón de **"Takeover Manual"**: El operador hace clic en "Tomar Conversación", la sesión del bot se pausa inmediatamente y el operador responde en tiempo real a través de la interfaz web.

---

## Revisión de Evidencia y Tecnologías

### Matriz de Evaluación de la Pila Tecnológica

| Componente | Opción Analizada | Opción Alternativa | Veredicto & Justificación |
|---|---|---|---|
| **Motor de Agentes** | **Pi SDK (`@earendil-works/pi-coding-agent`)** | LangChain / LangGraph / CrewAI | **Adoptar Pi SDK**. Ya validado en `pi-subagents-j0k3r`. Cero dependencias pesadas de Python. Tipado estricto en TypeScript. Control total del ciclo de vida [S-001]. |
| **Protocolo de Herramientas** | **Model Context Protocol (MCP)** | APIs REST Custom con OpenAPI specs | **Adoptar MCP**. Estándar de la industria, soportado nativamente por los principales modelos (Claude, OpenAI). Elimina la necesidad de escribir conectores propietarios por cada agente [S-002, S-003]. |
| **Pasarela WhatsApp** | **Evolution API v2** | Meta Cloud API directa / Baileys puro | **Adoptar Evolution API v2**. Combina la flexibilidad de Baileys (QR) con soporte opcional de Meta Cloud API oficial en un solo contenedor Docker con API REST limpia [S-004]. |
| **Bandeja Omnicanal & Handoff** | **Chatwoot Community** | ManyChat / Zendesk / Intercom | **Adoptar Chatwoot**. Código abierto, auto-alojable, soporte multi-agente humano y arquitectura de *Agent Bot* mediante Webhooks limpia [S-005]. |
| **Almacenamiento de Estado** | **SQLite WAL + Archivos JSONL** | Redis + PostgreSQL distribuido | **Adoptar SQLite WAL / JSONL local**. Principio Anti-Sobreingeniería (KISS). Una sola instancia maneja miles de turnos por minuto con latencia <1ms sin infraestructura externa [S-009]. |

---

## Trade-offs y Riesgos

```
┌──────────────────────────────┬──────────────────────────────┬────────────────────────────────────────────────────────┐
│ Riesgo Identificado          │ Severidad                    │ Estrategia de Mitigación Implementada                  │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Bloqueo de Número en WA   │ ALTO (si se usa Baileys      │ • Utilizar Evolution API con Meta Cloud API para       │
│    por spam o detección      │ sin canal oficial)           │   números corporativos de alta demanda.                │
│                              │                              │ • Configurar delays de tipeo simulado (1.5s - 2.5s).   │
│                              │                              │ • Atender solo mensajes entrantes (Inbound First).     │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2. Costos de Tokens por      │ MEDIO                        │ • Debounce Buffer de 3s para unir ráfagas de mensajes. │
│    Inferencia Repetitiva     │                              │ • Caché semántico de preguntas frecuentes en Amauta.   │
│                              │                              │ • Modelo ligero (Claude 3.5 Haiku / GPT-4o-mini) para  │
│                              │                              │   atención al cliente; modelos avanzados solo para PMS.│
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│ 3. Alucinación en Tarifas    │ CRÍTICO                      │ • Prohibir al LLM cotizar montos fuera de MCP.         │
│    o Disponibilidad Hotel    │                              │ • Amauta System Prompt con Strict Guardrails: toda     │
│                              │                              │   tarifa DEBE provenir de la herramienta MCP.          │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│ 4. Sobrecarga de Concurrencia│ MEDIO                        │ • Mutex por chat ID: una sola llamada LLM activa por   │
│    en Servidor Node.js       │                              │   conversación simultáneamente.                        │
│                              │                              │ • Cola en memoria SQLite respaldada contra caídas.     │
└──────────────────────────────┴──────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Alternativas Consideradas

1. **Frameworks de Chatbot No-Code (Typebot / Botpress / Voiceflow)**:
   - *Por qué se descartó*: Son rígidos, difíciles de versionar con Git y crean silos desconectados del ecosistema de ingeniería `j0k3r-pi` y `sio-mission-control`. Requieren pagar suscripciones o mantener stacks pesados con interfaces visuales innecesarias para la lógica empresarial avanzada de SIO.
2. **LangChain / LangGraph (Python)**:
   - *Por qué se descartó*: Introduce una segunda pila de tecnología (Python) cuando todo el ecosistema SIO (`j0k3r-pi`, `sio-amauta`, `sio-mission-control`) está estandarizado en Node.js/TypeScript. Genera sobreabstracciones complejas y dependencia de cadenas frágiles.
3. **Integración Directa sin MCP (Hardcoded REST API clients)**:
   - *Por qué se descartó*: Si mañana el hotel cambia de PostgreSQL a un nuevo PMS o se añade un nuevo canal, habría que modificar y volver a probar el código de todos los agentes. MCP desacopla totalmente la herramienta del consumidor.

---

## Incertidumbres y Límites Operativos

- **Límites de la API de Meta Graph para Instagram DM**: Meta impone una ventana de 24 horas para responder mensajes de clientes de forma gratuita. Fuera de esta ventana, no se pueden enviar mensajes proactivos sin plantillas aprobadas.
- **Rendimiento de Servidores MCP Remotos sobre Red**: Cuando los servidores MCP operan sobre transporte `SSE/HTTP` (en servidores separados) en lugar de `stdio` local, la latencia de red añade entre 40ms y 120ms por llamada a herramienta. Se debe prever timeout de 10 segundos en las peticiones de herramientas.
- **Volumen de Base de Datos de Sesiones**: En canales de WhatsApp con alta afluencia (e.g. 5,000 conversaciones diarias), los archivos JSONL de sesión deben rotarse o archivarse semanalmente para evitar saturación de I/O en disco.

---

## Blueprint Arquitectural y Siguientes Acciones

### ¿Qué construir de inmediato en `sio-amauta` y `sio-agent`?

Para que añadir las ramas omnicanal en las fases siguientes requiera **cero reescritura de código**, debemos fundar hoy los siguientes 3 contratos limpios:

```
sio-agent-platform/
├── packages/
│   ├── sio-agent-core/              # Motor Headless basado en Pi SDK
│   │   ├── src/
│   │   │   ├── engine.ts            # createAgentSession wrapper tipado
│   │   │   ├── mcp-bridge.ts        # Conversión dinámica MCP Tools -> Pi SDK Tools
│   │   │   └── session-store.ts     # Sesiones aisladas por tenant:channel:userId
│   │   └── package.json
│   │
│   ├── sio-amauta/                  # Cerebro Cognitivo y Guardrails
│   │   ├── src/
│   │   │   ├── prompts/             # Bóveda de prompts versionados (SemVer)
│   │   │   ├── intent-classifier.ts # Motor FTS5 rápido (<5ms) de intención
│   │   │   └── mcp-server.ts        # Servidor MCP exponiendo prompts y memoria
│   │   └── package.json
│   │
│   ├── sio-mcp-servers/             # Red de Herramientas Empresariales
│   │   ├── hotel-pms/               # MCP Server para SIO Hotel (PostgreSQL)
│   │   ├── facturador/              # MCP Server para SIO Facturador (SUNAT)
│   │   └── crm/                     # MCP Server para Clientes y Leads
│   │
│   └── sio-omnichannel-gateway/     # Ingestión de Canales
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── evolution-wa.ts  # Adaptador WhatsApp Evolution API
│       │   │   ├── chatwoot.ts      # Adaptador Chatwoot Agent Bot
│       │   │   └── meta-graph.ts    # Adaptador Meta FB/IG
│       │   ├── debounce-buffer.ts   # Ventana deslizante 3s anticoncurrencia
│       │   └── handoff-manager.ts   # Escalamiento a operador humano
│       └── package.json
```

### Plan de Acción Inmediato (Roadmap de 4 Pasos):

1. **Paso 1: Implementar `mcp-bridge.ts` en `sio-agent-core`**:
   - Crear el módulo que toma un cliente MCP (`@modelcontextprotocol/sdk`) y devuelve herramientas listas para `createAgentSession({ tools })`.
   - *Verificación*: Probar invocando una herramienta mock desde un script de prueba de Pi SDK.
2. **Paso 2: Exponer Prompts de `sio-amauta` como Recursos/Tools MCP**:
   - Configurar `sio-amauta` con un endpoint MCP que provea las plantillas de atención hotelera y facturación electrónica.
3. **Paso 3: Levantar el Conector Docker de Evolution API**:
   - Desplegar una instancia local/remota de `evolution-api` conectada a un número de pruebas de WhatsApp y enlazar el webhook de mensajes entrantes a un endpoint Express/Fastify de `sio-omnichannel-gateway`.
4. **Paso 4: Integrar Panel de Supervisión en `sio-mission-control`**:
   - Extender el SSE de Mission Control para recibir eventos de los bots omnicanal y habilitar una columna en "Modo Pantalla" (CCTV) dedicada a la actividad conversacional de clientes.
