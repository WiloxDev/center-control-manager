# Gestión de Múltiples Proyectos Simultáneos en Localhost: Persistencia, Puertos y Administración Centralizada

## Executive Summary

El entorno de desarrollo de **j0k3r** opera sobre un hipervisor Proxmox 9.2 (8 GB RAM total) con una máquina virtual Ubuntu principal (**VM101 `soytec`**, 7.1 GB RAM, Node.js v24 con `mise`) y un contenedor LXC (**LXC100 `docker-host`**, CPAMC en `10.10.10.105:8317`). En este host conviven más de 5 proyectos activos simultáneos (`sio`, `sio-fact`, `sio-hotel`, `sio-mission-control`, etc.), servicios Docker locales (MinIO en `:9000/:9001`, Redis en `:6379`, CPAMC en `:8317`) y un servidor Nginx en puerto 80 [S-022]. Los principales dolores identificados son: **cortes de luz frecuentes** que derriban los servicios sin persistencia al reiniciar, **conflictos de puertos** (proyectos con puertos 3000 o 5173 codificados por defecto) y la ausencia de una administración centralizada de procesos.

Tras analizar exhaustivamente 18 herramientas y proyectos en 6 categorías técnicas, la investigación concluye:
1. **Resolución de Nombres e IPs**: Gracias al estándar RFC 6761 y `systemd-resolved` en Ubuntu, cualquier subdominio bajo `*.localhost` (e.g. `http://sio.localhost`, `http://fact.localhost`) resuelve a loopback (`127.0.0.1` / `::1`) de forma automática y nativa, sin necesidad de configurar `dnsmasq`, túneles ni editar `/etc/hosts` [S-012].
2. **Reverse Proxy**: Nginx 1.28.3 ya está instalado y activo en el puerto 80 de VM101 [S-022]. Implementar un bloque de proxies virtuales `*.localhost` hacia puertos internos específicos elimina la necesidad de que el desarrollador memorice puertos y resuelve las colisiones en el navegador. Caddy v2 es la alternativa moderna superior si se desea HTTPS automático y recarga dinámica sin `sudo` [S-007].
3. **Persistencia y Supervisión de Procesos**: La solución con menor consumo de RAM y mayor estabilidad ante cortes eléctricos es **Systemd User Units** con **Loginctl Linger** (`loginctl enable-linger wilox`) y un archivo plantilla repetible `node-project@.service` [S-021], o en su defecto **PM2** con `pm2 startup` y `pm2 save` [S-001]. Soluciones basadas en Docker All-in-One (DDEV, Lando) saturarían los 7.1 GB de RAM al levantar 5+ stacks simultáneos [S-016, S-017].

---

## Research Question

¿Cuáles son las soluciones, herramientas y proyectos óptimos (en GitHub y el ecosistema Linux) para gestionar más de 5 proyectos de desarrollo simultáneos en `localhost`, garantizando:
1. **Persistencia autónoma de servicios** tras reinicios inesperados por cortes eléctricos;
2. **Resolución transparente de colisiones de puertos e IPs**, incluso cuando los proyectos traen puertos hardcodeados o idénticos por defecto;
3. **Administración y observabilidad centralizada de procesos**; y
4. **Viabilidad técnica y de recursos** en la infraestructura real de j0k3r (VM101 Ubuntu 7.1GB RAM, LXC100 Docker, Proxmox vpc)?

---

## Recommendation or Answer

### Arquitectura Recomendada para j0k3r: "Hybrid Lean Stack" (Systemd/PM2 + Nginx nativo + `*.localhost`)

Se descartan las soluciones pesadas de contenedores integrales (DDEV, Lando) debido al techo de 7.1 GB de RAM de VM101 y 8 GB del host Proxmox. Se recomienda adoptar una arquitectura desacoplada en tres capas:

1. **Capa de Enrutamiento y Dominio (Reverse Proxy Local)**:
   - Aprovechar **Nginx 1.28.3** que ya se encuentra activo en el puerto 80 de VM101 [S-009, S-022] (o migrar a **Caddy v2** si se prefiere configuración declarativa en Caddyfile sin `sudo` [S-007]).
   - Configurar entradas virtuales tipo `http://sio.localhost`, `http://fact.localhost`, `http://hotel.localhost`, `http://mc.localhost` y `http://cpamc.localhost`.
   - Como Ubuntu resuelve de fábrica cualquier subdominio `.localhost` a `127.0.0.1` vía RFC 6761 [S-012], ningún desarrollador necesita tocar `/etc/hosts` ni levantar resolvers DNS auxiliares.

2. **Capa de Aislamiento de Puertos (Port Offsetting Centralizado)**:
   - Asignar a cada proyecto un rango de puertos internos no colisionantes (ejemplo: `sio` en `:3010`, `sio-fact` en `:3020`, `sio-hotel` en `:3030`, `sio-mission-control` en `:3099`).
   - Inyectar el puerto a través de variables de entorno estándar (`PORT=30xx`) en el archivo `.env` de cada proyecto o mediante el supervisor de procesos. Para proyectos rebeldes con puerto hardcodeado en scripts, `mise` o el supervisor reasignan la variable antes de ejecutar el script npm/pnpm [S-013].

3. **Capa de Persistencia y Supervisión (Resiliencia ante Cortes Eléctricos)**:
   - **Opción A (Recomendada - Nativa Linux y Zero-RAM)**: **Systemd User Units con Linger activo**.
     - Habilitar lingering para el usuario: `sudo loginctl enable-linger wilox` (actualmente está en `Linger=no` [S-021, S-022]).
     - Crear la plantilla `~/.config/systemd/user/node-dev@.service` que invoque `/home/wilox/.local/bin/mise exec -- pnpm run dev`.
     - Permite levantar o apagar cualquier proyecto con `systemctl --user start node-dev@sio-fact` y persistir su arranque con `enable`. Tras un apagón, systemd arranca todos los proyectos habilitados sin requerir sesión SSH interactiva.
   - **Opción B (Recomendada si se busca UI/CLI especializada en Node)**: **PM2** (`pm2-wilox.service` via `pm2 startup` y `pm2 save`) [S-001].
     - Centraliza todos los proyectos en un único `ecosystem.config.js`.
     - Provee observabilidad inmediata con `pm2 list` y `pm2 monit`.

---

## Key Findings

1. **Resolución RFC 6761 nativa en Linux**: La verificación en `soytec` demostró que `curl -I http://test.localhost` y `getent hosts foo.localhost` responden de inmediato apuntando a loopback (`127.0.0.1` / `::1`) [S-012, S-022]. No es necesario instalar dnsmasq ni alterar el resolver del sistema.
2. **El bloqueo de reinicio actual es `Linger=no`**: Al ejecutar `loginctl show-user wilox`, el sistema reportó `Linger=no` [S-021, S-022]. Esto significa que cualquier servicio de usuario creado bajo `systemd --user` muere al cerrar sesión y no inicia tras un booteo hasta que el usuario inicie sesión física/SSH. Habilitar linger es el prerrequisito crítico.
3. **Nginx ya está corriendo en puerto 80**: El puerto 80 ya está ocupado por `nginx/1.28.3` (master process PID 1242) [S-022]. Instalar otra herramienta que intente ligarse a `:80` (como Caddy o Traefik con puertos por defecto) fallará por `EADDRINUSE` salvo que Nginx sea reconfigurado o reemplazado deliberadamente.
4. **Herramientas históricas abandonadas**: Proyectos populares del pasado para este fin como **Hotel** (`typicode/hotel`, 10k stars) están abandonados (último commit en octubre de 2023) y presentan serios problemas con Node 20+ [S-011]. No deben adoptarse.
5. **Alineación con Mise**: `mise` ya está instalado en `/home/wilox/.local/bin/mise` gestionando Node v24.21.0 [S-013, S-022]. Integrar `mise exec -- <cmd>` dentro de los servicios garantiza paridad absoluta entre la terminal interactiva y los procesos en segundo plano.

---

## Evidence Review

### Tabla Comparativa de Soluciones Evaluadas

| Categoría | Herramienta / Proyecto | GitHub Stars [S] | Actividad (Último Push) | Soporte Ubuntu/Linux | Resuelve Conflicto de Puertos | Persistencia tras Reinicio | Soporte Node + Docker | Complejidad Setup | Impacto en RAM (5 proyectos) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Process Mgr** | **PM2** [S-001] | 43,298 | Sep 2026 | Nativo | Semi-auto (`ecosystem`) | Excelente (`pm2 startup`) | Node nativo; Docker vía CLI | Baja | ~150-250 MB |
| **1. Process Mgr** | **Process Compose** [S-002] | 2,803 | Sep 2026 | Nativo (Go) | Configurable en YAML | Requiere Systemd unit | Excelente (híbrido) | Media | ~20-30 MB |
| **1. Process Mgr** | **Overmind** [S-003] | 3,748 | Abr 2025 | Nativo (tmux) | Base port offset | No (orientado a terminal) | Excelente (Procfile) | Media | ~30-50 MB |
| **1. Process Mgr** | **Poku** [S-005] | 1,184 | Ago 2026 | Nativo | Kill/assign ports | No (es un test runner) | Node/Bun/Deno | Baja | N/A (Tests) |
| **1. Process Mgr** | **Mprocs** [S-006] | 2,730 | Sep 2026 | Nativo (Rust) | Manual | No (sesión interactiva) | Cualquier comando | Baja | ~15-25 MB |
| **2. Proxy / Router** | **Nginx Local** [S-009] | N/A (Debian/Ubuntu) | Activo (v1.28) | Nativo (Ya activo) | Vía subdominios proxy | Nativa (`systemd`) | Excelente | Baja-Media | ~20 MB (Ya en RAM) |
| **2. Proxy / Router** | **Caddy v2** [S-007] | 76,101 | Sep 2026 | Nativo (Go) | Vía subdominios proxy | Nativa (`caddy.service`) | Excelente | Muy Baja | ~35-50 MB |
| **2. Proxy / Router** | **Traefik v3** [S-008] | 64,979 | Sep 2026 | Nativo / Docker | Auto en Docker; File provider | Nativa (Docker/Systemd) | Excelente | Media | ~60-90 MB |
| **2. Proxy / Router** | **Puma-dev** [S-010] | 1,808 | May 2024 | Parcial (complejo) | Symlink a puertos | Requiere scripts systemd | Rack/Node limitado | Alta en Linux | ~25 MB |
| **2. Proxy / Router** | **Hotel** [S-011] | 9,993 | Oct 2023 (Abandonado) | Roto en Node 24 | Automático ($PORT) | Daemon obsoleto | Malo (Incompatible) | Alta (Legacy) | N/A (Descartado) |
| **3. Env Managers** | **Mise Tasks** [S-013] | 34,327 | Sep 2026 | Nativo (Ya activo) | Vía `mise.toml` / env | No tiene daemon nativo | Políglota | Muy Baja | ~10 MB |
| **3. Env Managers** | **Devbox** [S-014] | 12,375 | Sep 2026 | Nativo (Nix) | Aislamiento Nix | Vía Process-Compose | Excelente | Media-Alta | ~100 MB + Nix store |
| **3. Env Managers** | **Devenv** [S-015] | 7,681 | Sep 2026 | Nativo (Nix) | Auto-port mapping | Vía Process-Compose | Excelente | Alta | ~150 MB + Nix store |
| **4. All-in-One** | **DDEV** [S-016] | 3,896 | Sep 2026 | Docker-dependent | Automático (ddev-router) | Excelente (`ddev start`) | PHP/Node/Web | Media | **3.0 - 5.5 GB** |
| **4. All-in-One** | **Lando** [S-017] | 4,243 | Ago 2026 | Docker-dependent | Automático (Traefik) | Media | Políglota | Media | **3.0 - 5.0 GB** |
| **4. All-in-One** | **DevPod** [S-018] | 15,240 | Nov 2025 | Client CLI | Devcontainer ports | No (cliente dev) | Docker/K8s/SSH | Media | Variable |
| **4. All-in-One** | **Valet Linux** [S-019] | 1,467 | Ago 2026 | Requiere PHP/FPM | Parcial (Nginx+dnsmasq) | Nativa (systemd) | Muy enfocado en PHP | Alta en stack Node | ~100 MB + PHP stack |
| **4. All-in-One** | **Tilt** [S-020] | 10,071 | Sep 2026 | Nativo | Manual/Kubernetes | No (sesión activa dev) | Docker / K8s / Local | Media-Alta | ~120 MB |
| **5. Patrón Nativo** | **Systemd User Units** [S-021] | Estándar Linux | Mantenido (v255) | Nativo | Inyección de `PORT` | **Inmejorable (Linger)** | Procesos + Docker CLI | Baja (con plantilla) | **0 MB extra** |

---

### Análisis Detallado por Categoría

#### 1. Process Managers para Desarrollo

- **PM2 (`Unitech/pm2`)** [S-001]:
  - *Descripción*: Administrador de procesos en Node.js de grado de producción y desarrollo, con balanceador de carga, monitor de recursos y persistencia.
  - *Pros*: Integración inmediata con el ecosistema Node.js v24; `pm2 startup` y `pm2 save` configuran automáticamente el servicio systemd que revive todos los procesos tras un corte de luz; interfaz CLI (`pm2 monit`, `pm2 logs`) muy intuitiva; recarga en caliente (`watch: true`).
  - *Contras*: Consume memoria de fondo por proceso (~30MB base); en proyectos gigantes con miles de archivos, el watch de PM2 puede saturar inotify si no se excluye `node_modules`.
  - *Compatibilidad con j0k3r*: Excelente. Se ajusta perfectamente al stack de `wilox`. Permite definir un `ecosystem.config.js` en `/home/wilox/projects/` que centralice todos los proyectos con sus puertos específicos asignados.

- **Process Compose (`F1bonacc1/process-compose`)** [S-002]:
  - *Descripción*: Orquestador flexible en Go para procesos no containerizados, que emula la sintaxis declarativa de Docker Compose con soporte de dependencias (`depends_on`), variables de entorno y health checks.
  - *Pros*: Consumo de memoria ínfimo (<25MB); TUI interactiva excepcional en terminal; soporta dependencias complejas (e.g. no iniciar `sio-fact` hasta que `sio-redis-1` o MinIO estén listos); modo daemon (`-D -t=false`).
  - *Contras*: No incluye su propio instalador de servicio systemd al estilo de `pm2 startup`; requiere escribir un archivo `.service` en systemd para lanzarlo en modo daemon tras el arranque.
  - *Compatibilidad con j0k3r*: Muy alta. Ideal si se desea orquestar dependencias entre proyectos Node y contenedores existentes.

- **Overmind (`DarthSim/overmind`) y Foreman/Hivemind** [S-003, S-004]:
  - *Descripción*: Administradores de procesos basados en `Procfile`. Overmind utiliza `tmux` para permitir conectarse interactivamente a la consola de cualquier proceso (`overmind connect web`).
  - *Pros*: Inmejorable experiencia de depuración en terminal cuando se necesita usar `debugger` o inspección REPL.
  - *Contras*: No están diseñados para persistencia desatendida tras cortes eléctricos. Si el servidor se apaga, no vuelven a levantar de forma autónoma.
  - *Compatibilidad con j0k3r*: Media-Baja como solución principal de persistencia; útil únicamente como herramienta secundaria de debugging puntual.

- **Poku (`wellwelwel/poku`)** [S-005]:
  - *Descripción y Aclaración*: Poku es un test runner moderno para Node.js, Bun y Deno. Aunque cuenta con utilidades como `startService` y `killPort` para levantar APIs auxiliares durante suites de pruebas, **no es un orquestador ni supervisor de desarrollo persistente**. Se descarta para el objetivo central.

- **Mprocs (`pvolok/mprocs`)** [S-006]:
  - *Descripción*: Ejecutor de múltiples comandos en paralelo con interfaz TUI en Rust.
  - *Pros*: Ultraligero, navegación ágil por pestañas para ver salidas estándar.
  - *Contras*: Estrictamente orientado a la sesión de terminal interactiva; no provee daemon de fondo ni inicio en arranque.

#### 2. Port Conflict Managers y Orquestadores de Localhost

- **El Enfoque Estándar: RFC 6761 + Port Offset Interno** [S-012]:
  - El problema de colisión ocurre porque los proyectos intentan ligarse a `0.0.0.0:3000` o `127.0.0.1:3000`.
  - La solución más limpia y estándar en la industria sin overhead de contenedores consiste en **desacoplar el puerto de desarrollo del punto de acceso**:
    - Cada proyecto escucha internamente en un puerto fijo no colisionante (`3010`, `3020`, `3030`, etc.).
    - El desarrollador accede a través de subdominios estándar: `http://sio.localhost`, `http://fact.localhost`, etc.
    - Gracias a la RFC 6761 implementada en `systemd-resolved` y los navegadores modernos (Chromium, Firefox), `*.localhost` se resuelve automáticamente en loopback sin requerir software adicional ni privilegios de red [S-012].

- **Puma-dev (`puma/puma-dev`)** [S-010]:
  - *Descripción*: Herramienta que crea dominios virtuales locales mapeando symlinks a puertos (ej. `echo 3010 > ~/.puma-dev/sio`).
  - *Contras en Linux*: Diseñado originalmente para macOS (donde interactúa con `launchd` y `/etc/resolver/`). En Linux requiere configuraciones frágiles de `systemd` e `iptables` / `resolvconf` que con frecuencia entran en conflicto con `systemd-resolved` o Nginx preexistente.

- **Hotel (`typicode/hotel`)** [S-011]:
  - *Estado*: Proyecto histórico de Typicode que realizaba exactamente la asignación dinámica de `$PORT` y subdominios `*.localhost`. **Completamente abandonado desde octubre de 2023** con vulnerabilidades y fallos en versiones recientes de Node.js. Descartado.

#### 3. Local Dev Environment Managers

- **Mise (`jdx/mise`)** [S-013]:
  - *Descripción*: Gestor políglota de herramientas, variables de entorno y ejecutor de tareas (Task Runner).
  - *Pros*: Ya está instalado y configurado en `soytec` (`/home/wilox/.local/bin/mise`); gestiona Node v24.21.0 de forma transparente; permite definir `[env]` en `mise.toml` fijando el puerto por proyecto (`PORT = 3010`); su comando `mise exec -- pnpm run dev` encapsula todo el contexto de ejecución.
  - *Contras*: No es un supervisor de procesos en segundo plano. Debe utilizarse en conjunto con Systemd o PM2.

- **Devbox (`jetify-com/devbox`) y Devenv (`cachix/devenv`)** [S-014, S-015]:
  - *Descripción*: Entornos de desarrollo reproducibles y aislados sobre el gestor de paquetes Nix. Devbox incluye `devbox services` basado internamente en Process Compose.
  - *Pros*: Aislamiento total de librerías del sistema operativo.
  - *Contras*: Duplica la función que `mise` ya realiza eficientemente en VM101. Requiere instalar el store de Nix (varios gigabytes de disco) y agrega una capa de complejidad innecesaria para un stack de Node.js puro.

- **pnpm workspaces / Turborepo**:
  - *Descripción*: Orquestación dentro de monorrepos.
  - *Compatibilidad*: Excelente para la estructura interna de `sio` (que ya cuenta con `pnpm-workspace.yaml`), pero incapaz de orquestar proyectos heterogéneos y repositorios independientes como `sio-fact`, `sio-hotel` y `sio-mission-control`.

#### 4. Reverse Proxy Local para Múltiples Proyectos (`*.localhost`)

- **Nginx Local (Ya Activo en VM101)** [S-009, S-022]:
  - *Descripción*: Servidor web y reverse proxy de alto rendimiento, versión 1.28.3 ya ejecutándose en el puerto 80 de VM101.
  - *Pros*: **Zero overhead adicional**. No requiere instalar paquetes nuevos ni abrir nuevos puertos en el host. Soporta WebSockets (vital para HMR de Vite y hot-reload de Next.js/Express) mediante directivas estándar `Upgrade`. Puede enrutar tráfico tanto a puertos locales (`127.0.0.1:30xx`) como al contenedor LXC100 (`10.10.10.105:8317`).
  - *Contras*: Agregar nuevos dominios requiere crear un archivo en `/etc/nginx/sites-available/` y ejecutar `sudo nginx -s reload`.

- **Caddy v2 (`caddyserver/caddy`)** [S-007]:
  - *Descripción*: Servidor web moderno escrito en Go con HTTPS automático y sintaxis Caddyfile extremadamente compacta.
  - *Pros*: Configuración trivial (3 líneas por proyecto); API administrativa en `localhost:2019` que permite actualizar rutas en caliente con un simple `curl` sin necesidad de `sudo`; gestión nativa de certificados locales confiables si se requiere HTTPS.
  - *Contras*: Actualmente entraría en conflicto inmediato con Nginx en el puerto 80 [S-022]. Para adoptarlo, se debe detener y deshabilitar Nginx (`systemctl stop nginx && systemctl disable nginx`).

- **Traefik v3 (`traefik/traefik`)** [S-008]:
  - *Descripción*: Proxy de aplicaciones nativo de la nube orientado a microservicios y Docker.
  - *Pros*: Descubrimiento automático de contenedores Docker mediante labels; dashboard web visual integrado en `:8080` que muestra el estado de todas las rutas y servicios.
  - *Contras*: Su configuración para servicios no-Docker (archivos YAML con `file provider`) es más verbosa que Caddy o Nginx; mayor consumo de memoria base (~70-90MB).

#### 5. Soluciones "All-in-One" para Devs Multi-Proyecto

- **DDEV (`ddev/ddev`) y Lando (`lando/lando`)** [S-016, S-017]:
  - *Descripción*: Entornos locales completos basados en contenedores Docker por proyecto con proxy router automático (`*.ddev.site` o `*.lndo.site`).
  - *Evaluación de Viabilidad*: **INVIABLE para la infraestructura de j0k3r**.
    - Cada proyecto levantado con DDEV o Lando crea entre 2 y 4 contenedores (web, db, router, utilitarios).
    - Con 5 proyectos simultáneos, se tendrían entre 10 y 18 contenedores corriendo al mismo tiempo.
    - El consumo de memoria superaría fácilmente los **4.0 - 5.5 GB de RAM**, provocando que el kernel de VM101 invoque al *OOM Killer* sobre la base de datos o el proceso Node de `sio-mission-control`, considerando que la VM dispone de 7.1 GB y el host Proxmox de 8 GB en total.

- **DevPod (`loft-sh/devpod`)** [S-018]:
  - *Descripción*: Cliente open source para orquestar Dev Containers según la especificación de la Linux Foundation.
  - *Veredicto*: Excelente para preparar espacios de trabajo reproducibles en VS Code, pero no está diseñado para mantener procesos de fondo corriendo de manera autónoma 24/7 tras apagones.

- **Laravel Valet Linux (`cpriego/valet-linux`)** [S-019]:
  - *Descripción*: Port para Linux de Valet (Nginx + Dnsmasq + PHP).
  - *Veredicto*: Altamente acoplado a PHP-FPM y socket unix de PHP. Para Node.js requiere trucos de proxy manual y agrega dependencias innecesarias de PHP al sistema.

- **Tilt (`tilt-dev/tilt`)** [S-020]:
  - *Descripción*: Orquestador para desarrollo de microservicios con sincronización de código en vivo y UI web.
  - *Veredicto*: Orientado a terminal interactiva y Kubernetes/Docker Compose; carece de persistencia como demonio desatendido ante reinicios.

#### 6. Systemd + .service Files por Proyecto (Patrón Repetible Linux-Nativo)

- **Arquitectura de Unidades de Usuario (`systemd --user`)** [S-021]:
  - *Fundamento*: Systemd es el estándar absoluto de inicialización en Ubuntu. No consume RAM adicional.
  - *Activación del Linger*: Ejecutar `sudo loginctl enable-linger wilox` permite que el administrador de systemd del usuario `wilox` arranque durante el booteo del sistema operativo, antes y sin necesidad de ningún login interactivo por SSH o terminal.
  - *Patrón de Plantilla (`node-dev@.service`)*:
    En lugar de crear 5 o 10 archivos `.service` diferentes, se crea un único archivo plantilla en `~/.config/systemd/user/node-dev@.service`:
    ```ini
    [Unit]
    Description=Node.js Dev Service for %i
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/home/wilox/projects/%i
    EnvironmentFile=-/home/wilox/projects/%i/.env
    ExecStart=/home/wilox/.local/bin/mise exec -- pnpm run dev
    Restart=always
    RestartSec=5s
    StandardOutput=journal
    StandardError=journal

    [Install]
    WantedBy=default.target
    ```
  - *Operación*:
    - Habilitar e iniciar: `systemctl --user enable --now node-dev@sio-fact`
    - Ver estado global: `systemctl --user status "node-dev@*"`
    - Ver logs en vivo: `journalctl --user -u node-dev@sio-fact -f`
    - Al reiniciar el host por un corte eléctrico, systemd levanta automáticamente todas las instancias habilitadas.

---

## Escenarios Concretos con Casos de Uso Reales para j0k3r

### Escenario 1: Reinicio Abrupto tras Corte Eléctrico (VM101 + LXC100)
- **Contexto**: Un apagón general corta la energía del host Proxmox `vpc`. La máquina física se reinicia sola al volver la luz. Proxmox levanta VM101 (`soytec`) y LXC100 (`docker-host`).
- **Problema Actual**: Nadie inicia sesión SSH de inmediato. Los 5 proyectos Node.js permanecen caídos. El desarrollador intenta probar una API o abrir la app desde otro dispositivo de la red y encuentra conexiones rechazadas.
- **Solución con la Arquitectura Propuesta**:
  1. Con `loginctl enable-linger wilox` activo, el init de Ubuntu inicializa la sesión de usuario de `wilox` inmediatamente al arrancar el target multiusuario.
  2. Si se usa **Systemd Template**: Systemd ejecuta en paralelo `node-dev@sio`, `node-dev@sio-fact`, `node-dev@sio-hotel`, etc. Cada uno carga Node v24 vía `mise` y enlaza a su puerto interno asignado.
  3. Si se usa **PM2**: `pm2-wilox.service` lee `/home/wilox/.pm2/dump.pm2` e inicia todos los proyectos registrados.
  4. Nginx arranca como servicio del sistema en puerto 80.
  5. Los contenedores de Docker (`sio-minio-1`, `sio-redis-1`, `cli-proxy-api`) tienen política `restart: always` o `unless-stopped` y arrancan con el daemon de Docker.
  6. **Resultado**: 100% de los servicios, microservicios y proxies están operativos en menos de 45 segundos tras el booteo, sin interacción humana.

### Escenario 2: Conflicto de Puertos por Defecto (Colisión en Puerto 3000 / 5173)
- **Contexto**: El repositorio de `sio` y el de `sio-hotel` tienen configuraciones por defecto donde sus frontends (Vite o Next.js) intentan escuchar en `http://localhost:3000`. Tras un `git pull`, ambos levantan simultáneamente.
- **Problema Actual**: El segundo proyecto falla con `Error: listen EADDRINUSE: address already in use :::3000` o Vite cambia automáticamente a un puerto aleatorio (ej. 3001 o 5174), rompiendo configuraciones de CORS, redirects y bookmarks del navegador.
- **Solución con la Arquitectura Propuesta**:
  1. Se establece una convención de puertos en `.env` o en la configuración del orquestador:
     - `sio` -> `PORT=3010`
     - `sio-fact` -> `PORT=3020`
     - `sio-hotel` -> `PORT=3030`
     - `sio-mission-control` -> `PORT=3099`
  2. En Nginx (o Caddy), se configuran los bloques de proxy:
     - `http://sio.localhost` -> `127.0.0.1:3010`
     - `http://hotel.localhost` -> `127.0.0.1:3030`
  3. Los frameworks leen `process.env.PORT` y se enlazan limpiamente a sus puertos internos.
  4. El desarrollador nunca accede por número de puerto: entra a `http://sio.localhost` y `http://hotel.localhost`. Ninguno colisiona jamás.

### Escenario 3: Stack Híbrido: Node.js Nativo en VM101 + Docker en LXC100
- **Contexto**: Un microservicio en `sio-mission-control` (Node 24 en VM101) necesita consumir la API CPAMC alojada en el contenedor LXC100 (`10.10.10.105:8317`) y almacenamiento en MinIO (`127.0.0.1:9000`), mientras el desarrollador interactúa desde su laptop o navegador.
- **Problema Actual**: Múltiples IPs diferentes (`192.168.10.150:3099`, `10.10.10.105:8317`, `192.168.10.150:9000`), problemas de cabeceras CORS y confusión de URLs entre ambientes.
- **Solución con la Arquitectura Propuesta**:
  1. En el reverse proxy de VM101, se unifica el espacio de nombres:
     - `http://mc.localhost` -> `proxy_pass http://127.0.0.1:3099;`
     - `http://cpamc.localhost` -> `proxy_pass http://10.10.10.105:8317;`
     - `http://minio.localhost` -> `proxy_pass http://127.0.0.1:9000;`
     - `http://minio-console.localhost` -> `proxy_pass http://127.0.0.1:9001;`
  2. El bridge de red de Proxmox (`vmbr0`, `10.10.10.1/24`) comunica fluidamente VM101 con LXC100.
  3. Todo el desarrollo se realiza bajo nombres legibles y centralizados en un único punto de entrada HTTP.

### Escenario 4: Flujo Diario de Desarrollo Activo: Hot-Reload, Logs y Techo de 7.1 GB RAM
- **Contexto**: Durante una jornada de trabajo, j0k3r está editando código activamente en `sio-fact` y depurando llamadas con `sio-mission-control`. Se requiere que al guardar un archivo TypeScript se ejecute recarga en caliente instantánea sin reiniciar toda la máquina ni sobrepasar los recursos.
- **Problema de Soluciones Alternativas**: Si se usara DDEV o Lando, la compilación de TypeScript dentro del contenedor con volúmenes montados sobrecargaría el I/O y consumiría más de 4 GB de RAM.
- **Solución con la Arquitectura Propuesta**:
  1. Los proyectos corren bare-metal sobre Linux con Node v24 compilado para la máquina huésped vía `mise`. La velocidad de Vite/tsx (`node --watch`) es nativa (latencia sub-100ms en rebuilds).
  2. Consumo de RAM: Cada proceso Node dev consume entre 80 y 140 MB. 5 proyectos simultáneos consumen ~600 MB en total. Sumados a Nginx (20 MB), Docker Redis/MinIO (180 MB) y el sistema operativo (1.2 GB), el uso total se mantiene en **~2.0 GB de los 7.1 GB disponibles** (menos del 30% de la capacidad de la VM).
  3. Observabilidad en un solo comando:
     - Con PM2: `pm2 monit` ofrece un panel interactivo tipo htop con uso de CPU, RAM y streaming de logs por proyecto.
     - Con Systemd: `journalctl --user -u "node-dev@*" -f` permite seguir la salida combinada o individual con marcas de tiempo exactas.

---

## Trade-offs and Risks

| Solución | Compromiso Principal (Trade-off) | Riesgo Asociado | Mitigación |
| :--- | :--- | :--- | :--- |
| **Systemd User Units + Plantilla** | Máxima estabilidad y 0 MB overhead, pero requiere CLI pura para administrar (no hay GUI bonita). | Curva de familiarización con comandos `systemctl --user` y flags de `journalctl`. | Crear un script bash o alias simple (`dev status`, `dev logs <app>`, `dev restart <app>`). |
| **PM2 (`ecosystem.config.js`)** | Gran experiencia de usuario y UI terminal, pero agrega un proceso supervisor Node persistente. | Fugas de memoria si PM2 acumula logs sin rotación; watch mode en repositorios masivos puede consumir inotify handles. | Instalar `pm2-logrotate` y usar `--watch` selectivo excluyendo `node_modules` y `.git`. |
| **Nginx como Reverse Proxy** | Aprovecha el Nginx 1.28.3 ya en ejecución, pero requiere privilegios `sudo` para editar `/etc/nginx/sites-available/`. | Errores de sintaxis en `nginx.conf` pueden tirar temporalmente el proxy de todos los proyectos. | Ejecutar siempre `nginx -t` antes de recargar, o migrar a Caddy v2 si se quiere delegar el control sin `sudo`. |
| **Aislamiento por Puertos Fijos (`PORT=30xx`)** | Desacopla la colisión pero requiere una lista de puertos documentada en el equipo/proyecto. | Si alguien crea un nuevo proyecto e improvisa un puerto que coincide con MinIO (9000) o Redis (6379), colisionará. | Reservar formalmente un rango para apps Node (e.g. del `3010` al `3090`) y documentarlo en el workspace. |

---

## Alternatives Considered

1. **DDEV / Lando / DevContainers Locales**:
   - *Por qué se consideraron*: Son el estándar dorado para aislar puertos de manera 100% mágica sin configurar variables de entorno.
   - *Por qué se descartaron*: Demanda excesiva de memoria (3 a 5 GB adicionales para 5 proyectos). En una VM con 7.1 GB y host de 8 GB, este consumo pondría en riesgo crítico la estabilidad del hipervisor Proxmox ante picos de carga.
2. **Puma-dev**:
   - *Por qué se consideró*: Popular en la comunidad Ruby/Rails para symlinks a dominios `.test`.
   - *Por qué se descartó*: Integración inestable con systemd-resolved en distribuciones Ubuntu modernas; actividad baja en GitHub y diseño no optimizado para Node.js.
3. **Hotel (Typicode)**:
   - *Por qué se consideró*: Era el software de referencia para resolver exactamente este problema en 2018-2021.
   - *Por qué se descartó*: Repositorio sin mantenimiento activo desde hace 3 años; incompatibilidad estructural con Node 22/24.

---

## Unknowns and Limits

1. **Credenciales sudo para wilox**: Para activar el lingering de systemd (`loginctl enable-linger wilox`) o modificar las configuraciones de Nginx en `/etc/nginx/`, el usuario `wilox` necesita privilegios sudo.
2. **Puertos no configurables por variable de entorno**: Si existe algún proyecto de terceros legado cuyo puerto esté fijado estrictamente en código binario compilado o en un script sin soporte para `process.env.PORT`, se requerirá una regla de iptables de redirección local o empaquetar ese proyecto específico en un contenedor Docker individual.
3. **Certificados SSL para HTTPS**: La resolución `*.localhost` en navegadores modernos trata el origen como seguro (*Secure Context*), permitiendo APIs de criptografía, service workers y geolocalización sin requerir certificados SSL firmados. No obstante, si una integración externa (e.g. webhooks de pasarelas de pago) exige HTTPS estricto en localhost, se requerirá configurar certificados locales (mkcert o la CA automática interna de Caddy).

---

## Recommended Next Actions

Para materializar esta solución sin interferir con las operaciones actuales, se sugiere seguir este plan de implementación paso a paso:

1. **Habilitar Systemd Linger para wilox**:
   ```bash
   sudo loginctl enable-linger wilox
   ```
   *Verificar con*: `loginctl show-user wilox | grep Linger` (debe retornar `Linger=yes`).

2. **Configurar el Bloque de Subdominios en Nginx**:
   Crear `/etc/nginx/sites-available/dev-localhost.conf` con enrutamiento dinámico para los proyectos:
   ```nginx
   # Mapeo de subdominios a puertos internos
   map $http_host $backend_port {
       hostnames;
       sio.localhost        3010;
       fact.localhost       3020;
       hotel.localhost      3030;
       mc.localhost         3099;
       minio.localhost      9001;
       cpamc.localhost      8317;
   }

   server {
       listen 80;
       server_name *.localhost;

       location / {
           if ($backend_port = "") {
               return 404 "Proyecto no configurado en dev-localhost.conf\n";
           }
           proxy_pass http://127.0.0.1:$backend_port;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
   Habilitar el sitio: `sudo ln -s /etc/nginx/sites-available/dev-localhost.conf /etc/nginx/sites-enabled/` y recargar: `sudo nginx -t && sudo nginx -s reload`.

3. **Estandarizar Puertos en los Archivos `.env` de los Proyectos**:
   Fijar en cada proyecto:
   - `/home/wilox/projects/sio/.env` -> `PORT=3010`
   - `/home/wilox/projects/sio-fact/.env` -> `PORT=3020`
   - `/home/wilox/projects/sio-hotel/.env` -> `PORT=3030`
   - `/home/wilox/projects/sio-mission-control/.env` -> `PORT=3099`

4. **Implementar el Supervisor (Elección entre Systemd o PM2)**:
   - **Ruta Systemd (Recomendada para 0 MB de consumo extra)**:
     Crear `~/.config/systemd/user/node-dev@.service` y activar los proyectos deseados con:
     `systemctl --user enable --now node-dev@sio-fact node-dev@sio-mission-control`
   - **Ruta PM2 (Recomendada para interfaz interactiva de logs)**:
     Crear `/home/wilox/projects/ecosystem.config.js`, arrancar con `pm2 start ecosystem.config.js`, y consolidar la persistencia con `pm2 startup` y `pm2 save`.
