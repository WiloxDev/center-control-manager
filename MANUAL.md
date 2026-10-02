# Manual de Implementación e Instalación 🚀
**Center Control Manager — Engineering Cockpit, Action Radar & Decision Ledger**

Bienvenido a la guía oficial de implementación de **Center Control Manager**. Este documento detalla paso a paso cómo instalar, configurar e integrar esta herramienta en tu máquina de desarrollo o en la de tu equipo.

---

## 📋 Índice
1. [Requisitos Previos del Sistema](#1-requisitos-previos-del-sistema)
2. [Instalación Rápida (3 Minutos)](#2-instalación-rápida-3-minutos)
3. [Escenarios de Integración con el Ecosistema](#3-escenarios-de-integración-con-el-ecosistema)
   - [Escenario A: Ecosistema Completo (Gentle-Pi + Engram)](#escenario-a-ecosistema-completo-gentle-pi--engram)
   - [Escenario B: Modo Standalone (Sin IA / Solo Git y Radar)](#escenario-b-modo-standalone-sin-ia--solo-git-y-radar)
   - [Escenario C: Rutas y Puertos Personalizados](#escenario-c-rutas-y-puertos-personalizados)
4. [Guía de Uso del Dashboard](#4-guía-de-uso-del-dashboard)
5. [Variables de Entorno Soportadas](#5-variables-de-entorno-soportadas)
6. [Solución de Problemas (Troubleshooting)](#6-solución-de-problemas-troubleshooting)
7. [Casos de Uso del Mundo Real](#7-casos-de-uso-del-mundo-real)

---

## 1. Requisitos Previos del Sistema

Center Control Manager está diseñado bajo una arquitectura **Local-First**, ultraligera y sin dependencias externas pesadas:

- **Node.js**: Versión **v22.0.0** o **v24.0.0+** (requerido para el motor SQLite nativo `node:sqlite` y la ejecución directa de TypeScript con `--experimental-strip-types`).
- **Git**: Instalado en el sistema y disponible en la variable `PATH`.
- **Sistema Operativo**:
  - Linux (Ubuntu, Debian, Fedora, Arch, etc.)
  - macOS (Apple Silicon M1/M2/M3 y procesadores Intel)
  - Windows (mediante **WSL2** / Ubuntu en Windows)
- **Navegador Web**: Chrome, Edge, Brave, Firefox o Safari (cualquier navegador moderno).

> 💡 **Nota importante:** No necesitas instalar bases de datos externas (como MySQL o PostgreSQL) ni ejecutar compiladores pesados (Webpack/Vite). Todo corre de forma nativa e instantánea.

---

## 2. Instalación Rápida (3 Minutos)

Ejecuta los siguientes comandos en tu terminal:

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/WiloxDev/center-control-manager.git
cd center-control-manager
```

### Paso 2: Otorgar permisos de ejecución al script de arranque
```bash
chmod +x start.sh
```

### Paso 3: Validar que el sistema esté íntegro (Opcional pero recomendado)
Ejecuta la suite de pruebas unitarias y de integración para asegurar que tu entorno es 100% compatible:
```bash
npm test
```
*Deberías ver las 42 pruebas pasando en verde.*

### Paso 4: Iniciar el servidor
```bash
./start.sh
# o también:
npm start
```

### Paso 5: Abrir en tu navegador
Accede a la dirección:
👉 **`http://localhost:3099`**

Si estás en una red local o servidor remoto accesible por LAN, puedes acceder mediante:
`http://<TU_IP_LOCAL>:3099`

---

## 3. Escenarios de Integración con el Ecosistema

### Escenario A: Ecosistema Completo (Gentle-Pi + Engram)
*Recomendado para desarrolladores que trabajan con agentes de código autónomos.*

Si ya utilizas **gentle-pi** y **engram**:
1. **Detección Automática de Memoria:** El sistema leerá automáticamente tu base de datos de persistencia en `~/.engram/engram.db` en modo de solo lectura.
2. **Detección de Agentes:** Si tienes sesiones activas de `gentle-pi` o paneles multiplexados con **Herdr**, aparecerán de inmediato en la pestaña de **Terminales & Sesiones**, indicando si el agente está trabajando (`working`), esperando instrucciones (`blocked`) o libre (`idle`).
3. **Expedientes de Sesión:** En la pestaña **Pulso de Actividad** podrás revisar el resumen y objetivos de las últimas sesiones trabajadas por la IA.

### Escenario B: Modo Standalone (Sin IA / Solo Git y Radar)
*Ideal para desarrolladores tradicionales o amigos que no usan herramientas de IA.*

Si no tienes instalado `engram` ni agentes:
- El servidor arrancará sin errores en **modo resiliente (Graceful Fallback)**.
- Tendrás acceso completo al **Radar de Pendientes (Kanban)** para gestionar tareas de tus proyectos, agregar notas técnicas y registrar auditorías.
- Tendrás el **Visor de Portafolio Git** para monitorear ramas activas y estado limpio/sucio (`dirty`) de todos tus repositorios locales en `~/projects`.

### Escenario C: Rutas y Puertos Personalizados
Si tus proyectos no están en `~/projects` o si el puerto `3099` está ocupado:
```bash
# Ejemplo: Cambiar el puerto a 4000 y apuntar a tu carpeta de código
PORT=4000 PROJECTS_ROOT=/home/tu-usuario/workspace ./start.sh
```

---

## 4. Guía de Uso del Dashboard

Una vez abierto el panel en `http://localhost:3099`, dispones de 5 vistas clave:

### 1. 🎯 Radar de Pendientes (Action Radar & Kanban)
- **Captura rápida:** Cuando encuentres una mejora o bug secundario mientras programas, regístralo aquí seleccionando el proyecto y la prioridad (`HIGH`, `MEDIUM`, `LOW`).
- **Tablero Kanban:** Arrastra o cambia el estado entre **PENDIENTES**, **EN PROGRESO** y **COMPLETADAS**.
- **Notas Técnicas:** Añade comentarios de avance o decisiones dentro de cada tarjeta de tarea.

### 2. ⚡ Pulso de Actividad & Expedientes
- Selecciona cualquier sesión de desarrollo reciente para leer el **Briefing estructurado**:
  - Objetivos cumplidos (`Accomplished`).
  - Descubrimientos técnicos (`Discoveries`).
  - Decisiones de arquitectura (`Key Decisions`).
  - Siguientes pasos recomendados (`Next Steps`).

### 3. 🧠 Conocimiento & Registro ADR (Decisiones)
- Buscador con motor de texto completo (FTS5) sobre todas las memorias guardadas por la IA.
- Filtra por tipo: `decision`, `architecture` o `bugfix` para consultar el porqué de una decisión técnica del pasado sin tener que releer código antiguo.

### 4. 💻 Terminales & Coding Agents en Vivo
- Semáforo en vivo de tus terminales activas:
  - 🟢 **WORKING:** El agente está escribiendo código o ejecutando pruebas.
  - 🔴 **BLOCKED:** El agente necesita tu confirmación para avanzar.
  - ⚪ **IDLE:** Terminal esperando comandos.
- Muestra el PID, consumo de memoria RAM y rama Git activa de cada panel.

### 5. 📁 Portafolio de Proyectos & Git Health
- Lista centralizada de todos tus repositorios locales.
- Te muestra de un vistazo qué proyectos tienen cambios sin commitear (`dirty`), la rama actual y el último commit realizado.
- Marca tus proyectos clave con la estrella de **Favorito** para que siempre aparezcan en la parte superior.

---

## 5. Variables de Entorno Soportadas

Puedes configurar las siguientes variables de entorno para adaptar el sistema:

| Variable | Valor por Defecto | Descripción |
|---|---|---|
| `PORT` | `3099` | Puerto HTTP donde se sirve la aplicación. |
| `PROJECTS_ROOT` | `~/projects` | Directorio raíz que se escanea en busca de repositorios Git. |
| `ENGRAM_DB_PATH` | `~/.engram/engram.db` | Ruta a la base de datos SQLite de Engram. |
| `HERDR_DIR` | `~/.config/herdr` | Directorio de sockets y configuración del multiplexor Herdr. |
| `DB_PATH` | `data/mission-control.db` | Ruta a la base de datos local SQLite para el radar de tareas. |

---

## 6. Solución de Problemas (Troubleshooting)

### El puerto 3099 ya está en uso (`EADDRINUSE`)
Cambia el puerto al iniciar:
```bash
PORT=3500 ./start.sh
```

### No veo mis proyectos en el panel
Verifica que tus proyectos estén ubicados en `~/projects` o indica la ruta exacta con la variable `PROJECTS_ROOT`:
```bash
PROJECTS_ROOT=/ruta/a/mis/repositorios ./start.sh
```

### Error de permisos al ejecutar `./start.sh`
Asegúrate de otorgar permisos de ejecución:
```bash
chmod +x start.sh
./start.sh
```

### Error: `node: command not found` o versión de Node incompatible
Center Control Manager requiere Node.js v22 o v24+. Verifica tu versión actual con:
```bash
node -v
```
Si tienes una versión anterior a v22, actualiza Node.js desde [nodejs.org](https://nodejs.org) o utiliza un gestor de versiones como `nvm` o `mise`:
```bash
# Con nvm
nvm install 24
nvm use 24
```

---

## 7. Casos de Uso del Mundo Real

### 🚀 Caso 1: Sesión de Desarrollo Asistida con Gentle-Pi + Engram
- **El reto:** Estás trabajando en una refactorización compleja con un coding agent (`gentle-pi`). Mientras el agente escribe código, notas que hace falta actualizar los índices de la base de datos y añadir un endpoint de salud.
- **Cómo te ayuda:** 
  1. Abres el **Radar de Pendientes** y creas dos tareas rápidas asociadas a ese proyecto en 5 segundos sin pausar al agente ni cambiar de ventana.
  2. En la pestaña **Terminales**, monitoreas en vivo el estado del agente: ves si está `WORKING` (programando) o `BLOCKED` (esperando tu aprobación).
  3. Al terminar la sesión, el agente guarda automáticamente la memoria en **Engram**, y tú puedes leer en el **Pulso de Actividad** el resumen estructurado con los objetivos logrados y los siguientes pasos.

### 📁 Caso 2: Gobernanza de Portafolio Multi-Repositorio (Freelancer o Tech Lead)
- **El reto:** Lideras o mantienes 8 repositorios distintos (`backend-api`, `mobile-app`, `admin-portal`, `auth-service`, etc.). Cada mañana pierdes 15 minutos abriendo carpetas y ejecutando `git status` para recordar qué dejaste a medias.
- **Cómo te ayuda:**
  1. Abres la pestaña **Portafolio & Git Health**: ves en una sola pantalla todos tus repositorios, la rama Git activa de cada uno, cuáles tienen cambios sin commitear (`dirty`) y cuántas tareas pendientes tiene cada proyecto.
  2. Marcas con estrella ⭐ tus 2 proyectos prioritarios del día para que siempre se ubiquen al principio de la lista.

### 🏛️ Caso 3: Bitácora de Decisiones Arquitectónicas (ADR Ledger)
- **El reto:** Un compañero de equipo o tú mismo se preguntan: *"¿Por qué implementamos autenticación con cookies HttpOnly en vez de JWT en localStorage?"* o *"¿Por qué usamos SQLite en lugar de PostgreSQL en este servicio?"*.
- **Cómo te ayuda:**
  1. Entras a la pestaña **Conocimiento & Decisiones (ADR)**.
  2. Escribes en el buscador `autenticacion` o `sqlite`: el motor de texto completo (FTS5) te devuelve al instante la tarjeta con la decisión exacta tomada hace semanas, explicando el **Qué**, el **Por qué**, el **Dónde** y el **Aprendizaje técnico**.

### ☕ Caso 4: Reanudación Rápida tras Vacaciones o Fin de Semana (Cero Amnesia)
- **El reto:** Vuelves a programar el lunes por la mañana después del fin de semana o de unas vacaciones y no recuerdas en qué punto exacto te quedaste.
- **Cómo te ayuda:**
  1. Entras al **Pulso de Actividad** y seleccionas la última sesión de trabajo.
  2. Lees directamente la sección `Next Steps` generada por el sistema: sabes con precisión quirúrgica qué archivo abrir y qué tarea continuar en menos de 30 segundos.

### 🧹 Caso 5: Limpieza de Deuda Técnica y Refactorización Ágil (Kanban)
- **El reto:** Tu equipo identifica pequeñas mejoras durante el code review que no justifican crear un ticket formal y pesado en Jira o Linear.
- **Cómo te ayuda:**
  1. Las registras en el **Action Radar** como tareas de categoría `BUGFIX` o `INFRASTRUCTURE`.
  2. Durante los sprints de mantenimiento, abres la vista **Kanban**, arrastras las tareas de `PENDING` a `IN_PROGRESS` y finalmente a `COMPLETED`.
  3. Todo queda registrado en el historial de auditoría interna de la base de datos local.

---

## 📄 Licencia y Contribución
Proyecto desarrollado y estandarizado por **Wilox & Gentle Community**.  
Para sugerencias, issues o reportes de fallos, consulta el repositorio oficial:  
👉 [https://github.com/WiloxDev/center-control-manager](https://github.com/WiloxDev/center-control-manager)
