# Center Control Manager & Action Radar 🚀

**Developer Control Plane, Action Radar & Decision Ledger**

Center Control Manager es el centro de mando de ingeniería multi-proyecto diseñado para gobernar cualquier portafolio de proyectos de software en sincronía con **Gentle-Pi** y **Engram**.

---

## 🎯 Propósito
Evitar la amnesia y dispersión de tareas en sesiones de desarrollo intensivo:
1. **Radar de Pendientes ("Para Después" / Backlog):** Registra de forma centralizada cualquier mejora o pendiente sin que se pierda al cambiar de proyecto o compactar el contexto de la IA.
2. **Registro de Decisiones (ADR):** Conexión de solo lectura en vivo con la base de datos de **Engram** (`~/.engram/engram.db` o variable `ENGRAM_DB_PATH`) para consultar el porqué de cada decisión arquitectónica.
3. **Línea de Tiempo & Changelog:** Bitácora histórica de sesiones y avances por proyecto.
4. **Salud del Portafolio & Git:** Monitoreo en vivo de ramas Git activas, últimos commits y métricas de memoria.
5. **Terminales & Coding Agents:** Monitoreo y correlación de sesiones activas de **gentle-pi**, sockets IPC y paneles de trabajo.

---

## 🚀 Inicio Rápido

```bash
# Clonar o entrar al proyecto
cd center-control-manager

# Ejecutar suite de pruebas TDD (todas las rutas y contratos)
npm test

# Iniciar servidor en puerto 3099
./start.sh
# o
npm start
```

URL de acceso: `http://localhost:3099` (o en red local: `http://<IP_LAN>:3099`).

---

## ⚙️ Configuración (Variables de Entorno Opcionales)

El sistema funciona de inmediato sin configuración previa (Zero-Config), pero permite personalización:

| Variable | Valor por Defecto | Descripción |
|---|---|---|
| `PORT` | `3099` | Puerto HTTP del dashboard |
| `PROJECTS_ROOT` | `~/projects` | Directorio raíz donde residen tus proyectos Git |
| `ENGRAM_DB_PATH` | `~/.engram/engram.db` | Ruta a la base de datos de persistencia de Engram |
| `HERDR_DIR` | `~/.config/herdr` | Directorio de configuración y sockets de Herdr |

---

## 📡 API Endpoints Principales

- `GET /api/health` -> Chequeo de estado y versión del sistema.
- `GET /api/projects` -> Resumen del portafolio, ramas Git y conteo de memorias Engram.
- `GET /api/radar/tasks` -> Listado filtrado de tareas pendientes (`?project=...&status=PENDING&priority=HIGH`).
- `POST /api/radar/tasks` -> Crear una tarea pendiente.
- `PATCH /api/radar/tasks/:id` -> Cambiar estado (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `DEFERRED`).
- `POST /api/radar/tasks/:id/notes` -> Agregar nota técnica a una tarea.
- `GET /api/engram/observations` -> Consulta directa y segura de observaciones Engram (`?type=decision`).
- `GET /api/terminals/sessions` -> Sesiones activas de coding agents (`gentle-pi`, shells).
- `GET /api/stream` -> Canal de eventos en tiempo real (Server-Sent Events).

---

## 🏛️ Arquitectura
- **Backend:** Node.js v24 nativo con `node:sqlite` y TypeScript nativo (`--experimental-strip-types`), sin sobrecarga de dependencias externas.
- **Frontend:** Single Page Application (SPA) reactiva con Vue 3 y Tailwind CSS.
- **Persistencia:** Conexión de solo lectura a SQLite de Engram + almacenamiento local WAL en `data/mission-control.db`.
