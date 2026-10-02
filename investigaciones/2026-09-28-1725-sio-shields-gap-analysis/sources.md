# Sources

## Source Index

### S-001: OWASP Top 10 for Large Language Model Applications (2025/2026 Release v2.0)
- Family: PRIMARY
- URL or locator: https://genai.owasp.org/llm-top-10/
- Date/version: 2025-2026, Version 2.0
- Access method: curl / HTTP inspection of official OWASP GenAI Security Project repository
- Used for: Executive Summary, Key Findings, Clasificación taxonómica de vulnerabilidades LLM01 a LLM10
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: El estándar oficial de la industria para seguridad en aplicaciones LLM y agentes autónomos. Define la evolución de riesgos desde v1.0 a v2.0 incorporando fugas de system prompt y debilidades vectoriales.

### S-002: OWASP LLM01:2025 Prompt Injection (Direct and Indirect Attacks)
- Family: PRIMARY
- URL or locator: https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM01_PromptInjection.md
- Date/version: 2025/2026, Core Vulnerability Document
- Access method: curl / GitHub raw fetch
- Used for: Evidence Review 1, Escudo 26 (Desinfección de Salidas de Herramientas y Anti-Inyección Indirecta)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Establece que la delimitación directa en el input del usuario no es suficiente cuando el modelo ingiere datos externos o respuestas de herramientas (MCP/RAG), requiriendo aislamiento de contexto estricto.

### S-003: OWASP LLM06:2025 Excessive Agency
- Family: PRIMARY
- URL or locator: https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM06_ExcessiveAgency.md
- Date/version: 2025/2026
- Access method: curl / GitHub raw fetch
- Used for: Escudo 28 (Rompedor Determinista de Bucles), Escudo 35 (Protocolo HITL 2PC para Acciones Críticas)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Aborda los riesgos derivados de autonomía excesiva, permisos ilimitados y funcionalidad desmedida delegada a modelos agénticos, fundamentando la necesidad de doble custodia humana para acciones irreversibles.

### S-004: OWASP LLM07:2025 System Prompt Leakage
- Family: PRIMARY
- URL or locator: https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM07_SystemPromptLeakage.md
- Date/version: 2025/2026
- Access method: curl / GitHub raw fetch
- Used for: Escudo 36 (Protección contra Exfiltración con Token Canario)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Documenta que los prompts de sistema no deben tratarse como secretos infalibles y deben protegerse con canarios y filtros de egreso para no exponer lógica comercial confidencial.

### S-005: OWASP LLM08:2025 Vector and Embedding Weaknesses & LLM05:2025 Improper Output Handling
- Family: PRIMARY
- URL or locator: https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM08_VectorAndEmbeddingWeaknesses.md
- Date/version: 2025/2026
- Access method: curl / GitHub raw fetch
- Used for: Escudo 27 (Validación Estricta de Esquemas Zod), Escudo 34 (Aislamiento y Admisión de Memoria Semántica)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Analiza ataques de envenenamiento de datos en almacenamiento vectorial y bases de memoria persistente, además de la manipulación mediante outputs maliciosos no validados downstream.

### S-006: SQLite Official Documentation — Write-Ahead Logging (WAL Mode and Checkpoint Starvation)
- Family: PRIMARY
- URL or locator: https://www.sqlite.org/wal.html
- Date/version: SQLite Core Engine Specification
- Access method: curl / HTTP inspection
- Used for: Evidence Review 2, Escudo 30 (Prevención de Inanición de Checkpoints en SQLite WAL), Escudo 37
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Explica técnicamente cómo lectores concurrentes continuos impiden el truncado del archivo WAL (*checkpoint starvation*), produciendo crecimiento ilimitado del `.db-wal` y degradación severa de lecturas.

### S-007: Meta for Developers — WhatsApp Business Platform Messaging Limits and Quality Rating
- Family: PRIMARY
- URL or locator: https://developers.facebook.com/docs/whatsapp/messaging-limits/
- Date/version: Documentación Oficial Meta Graph API v21.0
- Access method: curl / HTTP inspection
- Used for: Evidence Review 4, Escudo 32 (Telemetría de Salud de WhatsApp y Calentamiento Gradual)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Detalla los tiers de capacidad de mensajes (Tier 250, 1,000, 10,000, 100,000), el cálculo del Quality Rating (`GREEN`, `YELLOW`, `RED`) y los bloqueos por reportes de spam de usuarios.

### S-008: Model Tool Calling & Structured Output Guidelines (Zod/Pydantic & Zero-Downtime Key Rotation)
- Family: IMPLEMENTATION
- URL or locator: https://platform.openai.com/docs/guides/function-calling / https://zod.dev
- Date/version: 2025-2026 Structured Outputs Standard
- Access method: Inspección de especificaciones y mejores prácticas de harness agéntico
- Used for: Escudo 27 (Validación Estricta de Esquemas e Interceptor Zod), Escudo 33 (Rotación Caliente de Secretos)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Documenta el uso de validación de esquemas tipados con rechazo de propiedades adicionales (`strict: true`) y reintentos automáticos para mitigar la alucinación de argumentos.

### S-009: IETF RFC 3339 / ISO 8601 & IANA Time Zone Database (America/Lima)
- Family: PRIMARY
- URL or locator: https://datatracker.ietf.org/doc/html/rfc3339 / IANA tz database
- Date/version: RFC 3339 / IANA 2026a
- Access method: Especificación estándar de marcas de tiempo en red
- Used for: Evidence Review 3, Escudo 31 (Normalización Canónica de Zonas Horarias y Reloj Atómico)
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Establece el estándar de formateo con offset explícito (`YYYY-MM-DDTHH:mm:ss-05:00`) para evitar desfases entre servidores UTC y operaciones comerciales en husos horarios locales.

### S-010: SIO Canonical Discovery Manual (`SIO-AGENT-MANUAL-CANONICO-DISCOVERY.md`)
- Family: IMPLEMENTATION
- URL or locator: `docs/SIO-AGENT-MANUAL-CANONICO-DISCOVERY.md`
- Date/version: 2026-09-28
- Access method: read / local repository file
- Used for: Baseline de los 25 Escudos Defensivos Integrados, Sección 5
- Usefulness: MATERIAL
- Confidence impact: HIGH
- Notes: Documento fundacional del ecosistema SIO que lista los 25 escudos iniciales y sirve de punto de partida para este análisis de brechas.

### S-011: Engram Architectural Memory Observations (Ecosistema Padre-Hijo y MCP)
- Family: IMPLEMENTATION
- URL or locator: `mem:1155`, `mem:1153`, `mem:1160`, `mem:988`
- Date/version: 2026-09-26 al 2026-09-28
- Access method: Engram search (`mem_search`)
- Used for: Contexto de `sio-amauta`, `sio-yuyay`, arquitectura Father & Child y contratos de MCP
- Usefulness: SUPPORTING
- Confidence impact: HIGH
- Notes: Observaciones de memoria grabadas que describen la interacción del SDK Amauta con los bots hijos y el almacenamiento local en SQLite WAL.
