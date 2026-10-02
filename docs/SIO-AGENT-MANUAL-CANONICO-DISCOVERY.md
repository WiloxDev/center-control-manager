# SIO AGENT PLATFORM: MANUAL CANÓNICO Y PLAN MAESTRO UNIFICADO
## Arquitectura Hexagonal "Padre e Hijos": SIO-Amauta (Harness & Padre SDK) & SIO-Yuyay (Memoria Evolutiva)
**Autor:** j0k3r & SIO Architecture Board  
**Fecha:** 28 de Septiembre de 2026  
**Versión:** 3.2.0-SHIELDS-37-MASTER  
**Estado:** Manual Canónico de Referencia de Ingeniería y Plan Maestro (Aprobado para Ejecución)  
**Alcance Tecnológico:** Node.js/Bun, TypeScript, Pi SDK Oficial (`@earendil-works/pi-coding-agent`), SQLite WAL + FTS5 trigrams, Model Context Protocol (MCP), Herdr UNIX IPC, Evolution API v2 / Meta Cloud API, PostgreSQL, Whisper STT, Caddy TLS 1.3, Docker, Telegram Bot, Proxmox VE, Systemd, Zod Strict Runtime Validation.

---

## 1. RESUMEN EJECUTIVO & DECLARACIÓN DE MISIÓN

### 1.1 El Problema Raíz
El ecosistema SIO gestiona simultáneamente desarrollo de software (`sio-mission-control`), gestión hotelera y reservas (`sio-hotel`), facturación electrónica SUNAT (`sio-facturador`) y experimentación (`sandbox`).

Hasta la fecha, la interacción con agentes de inteligencia artificial generaba una severa **sobrecarga cognitiva**:
1. Fatiga mental por tener que recordar fórmulas de prompts complejas que habían funcionado en el pasado (1,681 prompts dispersos en Engram).
2. Pérdida del hilo metodológico y del contexto caliente al alternar entre repositorios.
3. Fricción constante de selección, copia y pegado entre interfaces gráficas y terminales de ejecución.
4. Desconexión entre los agentes de ingeniería de software y las necesidades operativas del negocio (atención al cliente 24/7 en WhatsApp/Instagram, consulta de habitaciones y emisión de comprobantes).
5. Fragilidad en producción: riesgo de errores silenciosos en horas pico, alucinaciones en tarifas y falta de observabilidad.

### 1.2 La Declaración de Misión
> **"Transformar la experiencia del operador humano de ser un ejecutor fatigado por la memoria y la repetición, a convertirse en el Director Supremo de una familia de agentes inteligentes.  
> 
> A través de la unión de `SIO-Yuyay` (la memoria viva y consciente) y `SIO-Amauta` (el sabio padre orquestador y harness de producción), nuestra misión es dotar a cada proyecto de una inteligencia disciplinada, quirúrgica y sin sobreingeniería que preserve la historia, anticipe el futuro y ejecute con excelencia tanto en la consola de un servidor como en la conversación con un cliente."**

---

## 2. LOS 4 GRANDES MUNDOS DE APLICACIÓN DEL ECOSISTEMA SIO

La plataforma **NO es únicamente un creador de bots de WhatsApp**. WhatsApp es solo una interfaz de salida comercial. La arquitectura está diseñada para gobernar cuatro dimensiones estratégicas:

```
                                  ┌──────────────────────────────────────────────┐
                                  │               EL PADRE (CORE)                │
                                  │            SIO-AMAUTA + SIO-YUYAY            │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                ┌────────────────────────────────────────┼────────────────────────────────────────┐
                │                                        │                                        │
                ▼                                        ▼                                        ▼
   [ 💻 MUNDO 1: INGENIERÍA ]               [ 🛠️ MUNDO 2: DEVOPS & PROXMOX ]        [ 💼 MUNDO 4: NEGOCIO & CLIENTES ]
   • Tu terminal de desarrollo.             • Monitoreo de VMs en Proxmox.           • Bot de WhatsApp para Hoteles.
   • Atajos /ro, /go y ghost text.          • Auto-reinicio de servicios caídos.     • Asistente de Facturas SUNAT.
   • Reanudación rápida (/pickup).          • Auditoría nocturna de backups.         • Calificador de Leads en Instagram.
   • Prevención de sobreingeniería.         • Alertas de seguridad en el VPS.        • Webchat de soporte en tu web.
                                                         │
                                                         ▼
                                            [ 🔬 MUNDO 3: I+D Y AUDITORÍA ]
                                            • Deep Research técnico en internet.
                                            • Verificación cruzada TDD / Evals.
                                            • Análisis de código sin sobreingeniería.
```

### Mundo 1: Ingeniería de Software Personal (Para ti en el día a día)
- **Amnesia Cero**: `sio-yuyay` retiene funciones creadas hace meses, bugs resueltos y decisiones previas.
- **Flujo Zero-Copy en Terminal**: Atajos canónicos (`/ro`, `/go`) que inyectan código por socket UNIX a Herdr.
- **Texto Fantasma Predictivo**: Autocompletado inteligente en Pi TUI que predice el siguiente paso con `[Tab]`.
- **Reanudación en 30 Segundos**: `/wrap` congela la sesión al salir y `/pickup` la restaura en frío en 1 segundo.

### Mundo 2: DevOps, Infraestructura y Servidores Automáticos (SysAdmin Bot)
- **Guardián de Proxmox y Servicios**: Monitorea VM101, contenedores LXC y procesos Node.js.
- **Auto-Sanación (Self-Healing)**: Si un servicio cae a las 3:00 AM, detecta el fallo en logs, lo reinicia vía systemd y te notifica por Telegram.
- **Auditoría Nocturna de Backups**: Valida que los backups de bases de datos se generen limpios y prueba una restauración real.
- **Seguridad Perimetral**: Monitoreo de escaneos en VPS y bloqueo de atacantes con Fail2ban.

### Mundo 3: Investigación Profunda, Auditoría de Calidad y TDD Autónomo
- **Investigación Autónoma**: Agentes como `deep-researcher` que exploran la web, GitHub y papers para resolver dudas de arquitectura.
- **Barandas de Calidad (TDD)**: Ejecución de pruebas unitarias y suites de regresión antes de autorizar fusiones de código.
- **Anti-Sobreingeniería (KISS/YAGNI)**: Filtro que prohíbe abstracciones innecesarias o librerías pesadas sin justificación.

### Mundo 4: Negocio, Clientes y Operaciones Comerciales (Hijos de Cara al Público)
- **Recepción y Reservas (`sio-bot-hotel`)**: WhatsApp e Instagram atendiendo consultas, cotizando y bloqueando cuartos en PMS.
- **Comprobantes Electrónicos (`sio-bot-sunat`)**: Emisión, consulta y despacho automático de facturas, boletas, PDFs y XMLs.
- **Calificación de Leads (`sio-bot-crm`)**: Captura prospectos en redes sociales y agenda citas comerciales en el CRM.

---

## 3. EL PARADIGMA "EL PADRE Y SUS HIJOS"

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               EL PADRE: SIO-AMAUTA (HARNESS & SDK PLATFORM)                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Motor de Inferencia In-Process: Pi SDK oficial (`createAgentSession` / `@earendil-works/pi-coding`)  │
│ • Bóveda Cognitiva & Predictor Causal: `sio-yuyay` (SQLite WAL + FTS5 trigrams)                        │
│ • Red de Herramientas Universales: `mcp-bridge` (@modelcontextprotocol/sdk)                           │
│ • Ingesta Segura & Amortiguador de Borde: Webhook 200 OK inmediato + Cola desacoplada en base de datos│
│ • Cockpit Central de Supervisión: `sio-mission-control` (CCTV 1920px 4 columnas)                       │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   │ Herencia de ADN                │ Herencia de ADN                │ Herencia de ADN
                   ▼                                ▼                                ▼
      ┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
      │    HIJO 1: INGENIERO     │     │     HIJO 2: HOTELERO     │     │    HIJO 3: FACTURADOR    │
      │       (`j0k3r-pi`)       │     │    (`sio-bot-hotel`)     │     │     (`sio-bot-sunat`)    │
      ├──────────────────────────┤     ├──────────────────────────┤     ├──────────────────────────┤
      │ • Canal: Terminal/Herdr  │     │ • Canal: WhatsApp / IG   │     │ • Canal: WhatsApp / Web  │
      │ • Rol: Desarrollo & Test │     │ • Rol: Recepción 24/7    │     │ • Rol: Soporte Comprobant│
      │ • Tools: bash, edit, git │     │ • Tools: `mcp-sio-hotel` │     │ • Tools: `mcp-sunat`     │
      │ • Atajos: /ro, /go, /wrap│     │ • Guardrails: No inventar│     │ • Guardrails: Ley SUNAT  │
      │ • Zero-Copy por socket   │     │ • Modo Sombra inicial    │     │ • Pre-valida RUC activo  │
      └──────────────────────────┘     └──────────────────────────┘     └──────────────────────────┘
```

---

## 4. ARQUITECTURA HEXAGONAL CANÓNICA (PORTS & ADAPTERS)

El Núcleo de Negocio reside 100% aislado. No sabe si corre en una laptop local o en un VPS público en la nube; no sabe si un mensaje vino de WhatsApp, de una terminal o de Instagram.

```
                                  [ ADAPTADORES DE ENTRADA (INBOUND / DRIVING) ]
                                  ┌────────────────────────────────────────────┐
                                  │ • Terminal Herdr (Socket UNIX / IPC)       │
                                  │ • Pi TUI Autocomplete (Ghost text [Tab])   │
                                  │ • WhatsApp (Evolution API / Meta Cloud)    │
                                  │ • Instagram / Messenger (Chatwoot Webhook) │
                                  │ • SIO Mission Control (REST / SSE 1920px)  │
                                  │ • CLI Slash Commands (/ro, /go, /wrap)     │
                                  └──────────────────────┬─────────────────────┘
                                                         │
                                                         ▼
                                  ┌────────────────────────────────────────────┐
                                  │        PUERTOS DE ENTRADA (CONTRATOS)      │
                                  │ • `CustomerMessagePort`                    │
                                  │ • `EngineeringExecutionPort`               │
                                  │ • `PredictNextActionPort`                  │
                                  │ • `WrapSessionPort` / `PickupProjectPort`  │
                                  └──────────────────────┬─────────────────────┘
                                                         │
                                                         ▼
       ╔═════════════════════════════════════════════════════════════════════════════════╗
       ║                         EL NÚCLEO PURO (DOMINIO SIO - AISLADO)                  ║
       ║                                                                                 ║
       ║   🏛️ SIO-YUYAY CORE:                                                            ║
       ║   • Entidad de Memoria y Prompts SemVer (Inmutabilidad y linaje)               ║
       ║   • Minería de 1,681 prompts y limpieza de muletillas                           ║
       ║   • Máquina de Estados Causal (Markov / n-gramas con acierto Top-3)             ║
       ║   • Caché Semántico de FAQs (<20 ms, $0 tokens) + Coalescencia Single-Flight    ║
       ║   • Admisión Restrictiva de Hechos (Anti-Envenenamiento de Memoria)             ║
       ║                                                                                 ║
       ║   👑 SIO-AMAUTA CORE (LA HARNESS):                                              ║
       ║   • Orquestador de Agentes y Fábrica de Hijos (`spawnChild`)                    ║
       ║   • Gestión de 3 Capas Cognitivas: Agente + Sumarización + Memoria Semántica    ║
       ║   • Enrutador Natural de Intenciones (Sin menús IVR)                            ║
       ║   • Desescalamiento de Clientes Molestos (Análisis de Sentimiento)              ║
       ║   • Enmascaramiento PII (Ley 29733) y Defensa Anti-Prompt Injection             ║
       ║   • Interceptor de Esquemas Zod y Desinfección de Salidas MCP (CDR)             ║
       ║   • Rompe-Bucles Determinista y Presupuesto Pre-Vuelo contra Abismo de Tokens   ║
       ╚═════════════════════════════════════════════════════════════════════════════════╝
                                                         │
                                                         ▼
                                  ┌────────────────────────────────────────────┐
                                  │        PUERTOS DE SALIDA (CONTRATOS)       │
                                  │ • `MemoryStoragePort`                      │
                                  │ • `ToolRegistryPort`                       │
                                  │ • `LlmInferencePort`                       │
                                  │ • `NotificationPort` / `VoiceTranscribePort`│
                                  └──────────────────────┬─────────────────────┘
                                                         │
                                                         ▼
                                  [ ADAPTADORES DE SALIDA (OUTBOUND / DRIVEN) ]
                                  ┌────────────────────────────────────────────┐
                                  │ • SQLite WAL + FTS5 (`yuyay.db`)           │
                                  │ • Red MCP SIO (Hotel PMS, Facturador, CRM) │
                                  │ • Pi SDK (`createAgentSession` in-process) │
                                  │ • Modelos LLM (Gemini, Claude, NVIDIA, OLL)│
                                  │ • Whisper STT (Transcripción de Audios)    │
                                  │ • Evolution API / Meta Cloud Dispatcher    │
                                  │ • Telegram Bot (Canal de Alertas VIP)      │
                                  │ • Caddy Reverse Proxy TLS 1.3              │
                                  └────────────────────────────────────────────┘
```

---

## 5. LA BARAJA COMPLETA DE 37 ESCUDOS DEFENSIVOS INTEGRADOS

Esta arquitectura incorpora formalmente 37 salvaguardas de ingeniería defensiva basadas en producción real y OWASP LLM 2025/2026:

### A. Ingestión y Alta Disponibilidad (Harness de Mensajería)
1. **Amortiguador 200 OK Inmediato**: El webhook recibe el mensaje de WhatsApp, lo guarda en la cola de base de datos en <10 ms y responde `200 OK` de inmediato a Meta. Evita la pérdida silenciosa de mensajes en horas pico.
2. **Cola en Base de Datos (Anti-Sobreingeniería)**: Uso de SQLite WAL o PostgreSQL para la cola interna con pool de workers. Se descartan clusters pesados de RabbitMQ o Kafka para cargas normales.
3. **3 Reintentos & Mensajes Muertos (`Dead Letter Queue - DLQ`)**: Si una llamada a una herramienta o al LLM falla, se reintenta hasta 3 veces con pausas incrementales (1s, 2s, 4s). Al tercer fallo, se marca como `DEAD` y se notifica al panel de Mission Control sin bloquear la fila.
4. **Las 3 Capas Cognitivas**:
   - *Capa 1 (Agente Activo)*: Procesa los últimos 4-5 mensajes inmediatos.
   - *Capa 2 (Sumarización Automática)*: Comprime charlas largas en un resumen ejecutivo para no inflar la ventana de tokens.
   - *Capa 3 (Memoria Semántica Yuyay)*: Recuerda hechos permanentes del cliente (*"alérgico a plumas, pide cochera"*) que nunca se borran.
5. **Test de Carga Nativo (Stress Testing)**: Script automatizado que simula 10 mensajes por segundo antes de ir a producción para dimensionar la RAM y CPU requeridas en el VPS.
6. **Pre-Procesamiento en el Borde**: Audios e imágenes se convierten a texto limpio antes de entrar a la cola. El agente central solo recibe texto tipado.

### B. Perímetro VPS e Infraestructura
7. **Perímetro Zero-Trust (Firewall UFW)**: Solo puertos 80 y 443 abiertos. Las bases de datos y servidores MCP escuchan exclusivamente en `127.0.0.1` o sockets UNIX locales; jamás en `0.0.0.0`.
8. **Reverse Proxy TLS 1.3**: Caddy gestiona certificados SSL automáticos con Let's Encrypt forzando HTTPS y WSS cifrados.
9. **Ejecución Non-Root**: Todos los servicios corren bajo el usuario no privilegiado `sioapp:sioapp` sin permisos de sudo.
10. **Disaster Recovery en <10 Minutos**: Despliegue empaquetado en `docker-compose.prod.yml` y script `deploy.sh`. Si el VPS falla, un servidor nuevo se levanta y restaura el último backup cifrado en menos de 10 minutos.

### C. Seguridad del LLM y Privacidad de Datos
11. **Defensa Anti-Prompt Injection Directo**: Texto del usuario sanitizado y encapsulado en etiquetas XML (`<user_input>`). El bot de WhatsApp tiene prohibido el acceso a herramientas de shell (`bash`/`exec`).
12. **Enmascaramiento PII (Ley Peruana 29733)**: DNI de 8 dígitos, nombres y teléfonos se sustituyen por tokens anónimos (`[CLIENTE_ANON_1]`) antes de enviar al modelo en la nube.
13. **Depuración Higiénica de Datos**: Los audios `.ogg` se purgan a los 5 minutos de transcribirse. Los registros de chat se archivan y anonimizan a los 90 días. Cero almacenamiento de datos bancarios.

### D. Operatividad Comercial en Redes Sociales
14. **Transcripción de Audios de WhatsApp (Whisper STT)**: Procesa notas de voz en <800 ms para atender al 70% de clientes peruanos que no escriben.
15. **Circuit Breaker Financiero de Tokens**: Límite de 15 turnos o $0.08 USD por cliente en 24h. Al superar el tope, se deriva cortésmente a un humano.
16. **Debounce Buffer de 3 Segundos**: Agrupa ráfagas de mensajes cortos en una sola llamada al LLM (-65% de costo en tokens y cero carreras).
17. **Ventana de 24h de Meta y Plantillas HSM**: Registro de plantillas oficiales aprobadas por Meta para recordatorios de check-in y facturas fuera de sesión.
18. **Caché Semántico de FAQs (<20 ms, $0 Tokens)**: Preguntas repetitivas (horarios, ubicación, wifi, cochera) se contestan desde Yuyay sin llamar al LLM.
19. **Enrutador Natural de Intenciones**: Clasificador de lenguaje natural (<5 ms) que deriva al bot correspondiente (Hotel, Facturación, Ventas) sin menús IVR.
20. **Protocolo de Desescalamiento ante Clientes Molestos**: Detección de sentimiento negativo; apaga emojis, adopta tono formal y genera alerta roja prioritaria.

### E. Protección Financiera, Legal y Resiliencia
21. **Anti-Fraude de Yape/Plin Falso**: El bot **no confirma reservas por capturas de pantalla**. Emite links de pago oficiales (Niubiz/Izipay/Culqi) o deja la reserva en `PENDIENTE DE VERIFICACIÓN HUMANA` hasta confirmar el abono bancario.
22. **TTL de Pre-Reservas (20 min) y Mutex Anti-Overbooking**: Temporizador de liberación automática si no se paga en 20 minutos. Bloqueo pesimista en PostgreSQL (`SELECT FOR UPDATE`) para evitar doble venta simultánea.
23. **Cumplimiento Indecopi (Libro de Reclamaciones)**: Entrega inmediata del enlace virtual ante palabras de queja y congelamiento de la insistencia comercial.
24. **Canal de Alertas VIP a tu Celular**: Bot de Telegram/WhatsApp Admin que avisa al dueño sobre ventas confirmadas, intentos de inyección o caídas de servicios.
25. **Kill Switch de Emergencia**: Comando administrativo o botón de pánico en Mission Control (`SIO_PANIC_KILL_ALL`) que pone a todos los bots en modo mantenimiento en 1 milisegundo.

### F. Seguridad Agéntica Profunda y Gobierno de Herramientas (Nuevos Escudos OWASP)
26. **Desinfección de Salidas MCP y Anti-Inyección Indirecta (Tool-Output CDR)**: Todo dato devuelto por herramientas MCP o RAG se encapsula en `<untrusted_tool_result origin="mcp_pms">` y se sanea sintácticamente para impedir que instrucciones hostiles incrustadas en nombres o notas alteren las directivas del agente.
27. **Interceptor de Esquemas Zod y Parámetros Alucinados (OWASP LLM05)**: Validación estricta con `.strict()` antes de tocar el bus MCP. Poda automática de campos no reconocidos y autocorrección de tipos (<300 ms) sin propagar errores 500 al usuario.
28. **Rompe-Bucles Determinista y Límite de Pila en Subagentes**: Máximo 5 llamadas a herramientas por turno. Detección de firmas `SHA256(tool_name + args)` idénticas consecutivas para cortar bucles infinitos de raíz y transferir a un operador humano.
29. **Presupuesto Previo al Turno y Amortiguador del "Abismo de Tokens"**: Pre-flight check que reserva 2,048 tokens de salida garantizados. Si la ventana está por agotarse, fuerza la sumarización de la Capa 2 antes de invocar al modelo, previniendo JSONs truncados a la mitad.

### G. Integridad Transaccional, Memoria y Secretos
30. **Prevención de Inanición de Checkpoints en SQLite WAL (WAL Starvation Guard)**: Cero cursores abiertos asíncronos en `yuyay.db`. Ejecución de checkpoints pasivos (`PRAGMA wal_checkpoint(PASSIVE)`) cada 60s. Alerta amarilla si el archivo WAL supera 30 MB; truncado forzado si supera 100 MB.
31. **Reloj Atómico y Normalización Canónica de Zonas Horarias (`America/Lima`)**: Forzado canónico de hora IANA `America/Lima` (UTC-5) en el runtime. Heurística de Medianoche (00:00 - 05:00 AM) con confirmación explícita obligatoria ante frases como *"para hoy"* o *"para esta noche"*.
32. **Semáforo de Salud y Calentamiento de WhatsApp (Meta Quality Shield)**: Webhook de calidad (`phone_number_quality_update`). Si la calidad cae a `YELLOW`, se apagan envíos proactivos para evitar el baneo de la línea. Calentamiento gradual para números nuevos (máx 50/día la primera semana).
33. **Rotación Caliente de Secretos con Anillo de Doble Llave (Zero-Downtime)**: Key Ring en memoria (`PRIMARY` y `FALLBACK`). Recarga dinámica en caliente vía señal `SIGHUP` sin reiniciar procesos ni tirar conexiones WebSocket.
34. **Admisión Restrictiva y Aislamiento de Memoria Semántica en Yuyay**: Lista blanca taxonómica estricta. Descuentos, roles, saldos o tarifas **tienen prohibido** provenir de la memoria inferida por IA; solo se leen de tablas autoritativas en PostgreSQL.
35. **Protocolo de Doble Custodia Humana para Acciones Críticas (HITL 2PC)**: Herramientas irreversibles (cancelar reservas, reembolsos, anular facturas) no se ejecutan solas: generan un token temporal y envían una alerta interactiva a tu Telegram para aprobación obligatoria en dos pasos.
36. **Protección contra Exfiltración con Token Canario**: Inyección dinámica en el system prompt de un token canario aleatorio. Un filtro de salida (<1 ms) intercepta cualquier respuesta que contenga el token o alta similitud con el prompt del sistema antes de despacharse a WhatsApp.
37. **Coalescencia Single-Flight y Anti-Estampida de Caché**: Si 50 clientes preguntan lo mismo en el mismo segundo y la caché expiró, solo la primera petición consulta la base de datos o el LLM; las 49 restantes se acoplan a la misma promesa en memoria, reduciendo la carga en un 98%.

---

## 6. HOJA DE RUTA POR REBANADAS VERTICALES (FASES 0 A 4)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           HOJA DE RUTA POR REBANADAS VERTICALES                                  │
├─────────┬───────────────────┬──────────────────────────────────┬─────────────────────────────────┤
│ Fase    │ Nombre            │ Qué se construye                 │ Criterio de Salida Cuantitativo │
├─────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **0**   │ **Cimientos**     │ Esquema congelado de `yuyay.db`, │ Backup de `yuyay.db` probado    │
│         │                   │ contrato SDK Amauta, política de │ con una **restauración real**.  │
│         │                   │ PII y blindaje VPS.              │ Checklist de seguridad firmado. │
├─────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **1**   │ **Yuyay Usable**  │ Ingesta idempotente de 1,681     │ • Búsqueda < 2 ms.              │
│         │ *(Valor en días)* │ prompts, curación manual de      │ • `/pickup` restaura en < 1 s.  │
│         │                   │ grupos y `/pickup` mínimo.       │ • Cero duplicados al reingestar.│
├─────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **2**   │ **Amauta Núcleo** │ Variables `{{project}}`, atajos  │ Predicción n-gramas supera      │
│         │                   │ `/ro`, `/go`, `/wrap` y modelo   │ el baseline en acierto **Top-3**│
│         │                   │ de predicción por n-gramas.      │ sobre datos históricos.         │
├─────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **3**   │ **Fricción Cero** │ Socket Herdr, ghost text en Pi   │ % medido de sugerencias         │
│         │                   │ TUI y Sidebar en Mission Control │ aceptadas con `[Tab]` (si es    │
│         │                   │ con botón de copiar fórmulas.    │ bajo, se apaga o ajusta).       │
├─────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────┤
│ **4**   │ **Hijo Piloto**   │ SIO-Hotel con Postgres SOLO      │ Bot resuelve 50 consultas en    │
│         │                   │ LECTURA + WhatsApp en **Modo     │ **Modo Sombra** sin corrección  │
│         │                   │ Sombra** (humano aprueba antes). │ humana antes de ir a vivo.      │
└─────────┴───────────────────┴──────────────────────────────────┴─────────────────────────────────┘
```

---

## 7. POLÍTICA DE PRIVACIDAD Y CÓDIGO SOBERANO

1. **Licencia de Terceros**: El SDK oficial de Pi (`@earendil-works/pi-coding-agent`) está liberado bajo licencia **MIT**. Permite integración in-process, modificación y redistribución comercial sin regalías.
2. **Blindaje de Código Propietario SIO**:
   - **PROHIBICIÓN ESTRICTA**: El código fuente de `sio-amauta`, `sio-yuyay` y los servidores MCP **NUNCA se publicará en el registro público de npmjs.com**.
   - Toda distribución entre servidores y máquinas se realiza mediante **carpetas locales (`/home/wilox/...`)** o **repositorios Git privados con autenticación SSH**.
   - Las fórmulas de prompts, guardrails y bases de datos son propiedad 100% privada de SIO.

---

## 8. CRITERIOS DE ACEPTACIÓN CUANTITATIVOS (DEFINITION OF DONE)

| Métrica | Umbral de Aceptación Requerido |
|---|---|
| **Búsqueda en Yuyay FTS5** | Latencia estricta inferior a **2 ms**. |
| **Comando `/pickup`** | Briefing y restauración de contexto de proyecto en menos de **1 segundo**. |
| **Ingesta Idempotente** | Ejecutar el script de ingesta 10 veces produce exactamente el mismo número de filas (0 duplicados). |
| **Predicción Causal** | La sugerencia de siguiente paso supera la tasa de acierto del baseline en el **Top-3**. |
| **Ghost Text en Terminal** | Se mide el porcentaje de aceptación con `[Tab]`. Si no aporta valor medible, se desactiva. |
| **Bot en Modo Sombra** | 50 consultas reales consecutivas aprobadas por el operador humano sin corrección antes de habilitar el envío en vivo. |
| **Disaster Recovery** | Restauración completa de servicios en un VPS limpio en menos de **10 minutos**. |

---

**Documento Sellado y Aprobado para Ejecución.**  
*SIO Architecture Board — Septiembre 2026.*
