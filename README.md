# Center Control Manager & Project Radar 🚀

**Developer Control Plane, Action Radar & Decision Ledger**

Center Control Manager es el centro de mando de ingeniería multi-proyecto diseñado para gobernar el portafolio de proyectos de **j0k3r / Wilox** (`sio`, `sio-hotel`, `sio-fact`, etc.).

---

## 🎯 Propósito
Evitar la amnesia y dispersión de tareas en sesiones de desarrollo intensivo:
1. **Radar de Pendientes ("Para Después" / Backlog):** Registra de forma centralizada cualquier mejora o pendiente sin que se pierda al cambiar de proyecto o compactar el contexto de la IA.
2. **Registro de Decisiones (ADR):** Conexión de solo lectura en vivo con la base de datos de **Engram** (`/home/wilox/.engram/engram.db`) para consultar el porqué de cada decisión arquitectónica.
3. **Línea de Tiempo & Changelog:** Bitácora histórica de sesiones y avances por proyecto.
4. **Salud del Portafolio & Git:** Monitoreo en vivo de ramas Git activas, últimos commits y métricas de memoria.
5. **Infraestructura IA & CPAMC:** Centro de control y auto-rotación de cuentas y pools de modelos de IA.

---

## 🚀 Inicio Rápido

```bash
# Entrar al proyecto
cd /home/wilox/projects/center-control-manager

# Ejecutar pruebas unitarias
npm test

# Iniciar servidor de desarrollo en puerto 3099
./start.sh
# o
npm start
```

URL de acceso: `http://localhost:3099` (o en red local: `http://<IP_LAN>:3099`).

---

## 📡 API Endpoints

- `GET /api/health` -> Chequeo de estado y versión.
- `GET /api/projects` -> Resumen del portafolio, ramas Git y conteo de memorias Engram.
- `GET /api/radar/tasks` -> Listado filtrado de tareas pendientes (`?project=sio-hotel&status=PENDING&priority=HIGH`).
- `POST /api/radar/tasks` -> Crear una tarea pendiente.
- `PATCH /api/radar/tasks/:id` -> Cambiar estado (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `DEFERRED`).
- `GET /api/engram/observations` -> Consulta directa y segura de observaciones Engram (`?type=decision`, `?project=sio`).

---

## 🏛️ Arquitectura
- **Backend:** Node.js v24 nativo con `node:sqlite` y TypeScript nativo (`--experimental-strip-types`), sin sobrecarga de dependencias externas.
- **Frontend:** Single Page Application (SPA) reactiva con Vue 3 y Tailwind CSS.
- **Persistencia:** Conexión de solo lectura a `/home/wilox/.engram/engram.db` + almacenamiento JSON local para el radar de pendientes en `data/tasks.json`.
