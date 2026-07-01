# Contexto del proyecto — Sistema de Trazabilidad Grupo LC

> Handoff para continuar en otro equipo. Última actualización: sesión de preparación de feria.
> Repo: `github.com/escandarr/SistemaDeTrazabilidad` · rama `main` · último commit `439542c`.

## 1. Qué es
PWA para digitalizar la trazabilidad de materiales de **Grupo LC** (pisos industriales), de la **bodega a la obra**. Reemplaza el proceso en papel (registro manual de entrada/salida, pesaje y tara a mano, re-tipeo en Avesoft). Proyecto académico; hay una **feria de presentación** pendiente.

Flujo del negocio: **Solicitud → Picking (pesaje) → Despacho (Avesoft) → Devolución → Consumo real**, más inventario con alertas, sustitución entre proveedores, y gestión de usuarios/roles.

## 2. Accesos rápidos
| Qué | Dónde |
|---|---|
| Frontend (Vercel) | https://sistema-de-trazabilidad.vercel.app |
| Backend (Railway) | https://sistemadetrazabilidad-production.up.railway.app |
| Health / API docs | `…/health` · `…/docs` |
| Login demo | `admin@grupolc.cl` / `admin1234` |

> Ojo: el host de Railway es `sistema**de**trazabilidad-…` (con "de").

## 3. Stack
- **Frontend:** React 19 + TypeScript + Vite, PWA (`vite-plugin-pwa`). Fuentes self-hosted (Archivo + IBM Plex Mono). Deploy en **Vercel** (auto-deploy en cada push a `main`, Root Directory = `frontend`, `VITE_API_URL` = `<backend>/api/v1`).
- **Backend:** FastAPI async + SQLAlchemy 2.0 async + asyncpg + Pydantic v2 + JWT (python-jose) + bcrypt 4.0.1. Deploy en **Railway** (Docker, `backend/Dockerfile`).
- **DB:** PostgreSQL (plugin de Railway).
- **Avesoft:** sin API. Integración por **CSV**: P1 importar catálogo, P2 despacho (salidas), P3 devolución (reingresos).

## 4. Estado actual (todo funcionando en producción)
Backend prod verificado al día (invitaciones + auto-seed), frontend al día, 14 productos de feria cargados. Módulos completos:
- **RF01** Usuarios: alta por **invitación con enlace** (el usuario crea su clave), carga masiva CSV, roles. Contraseñas de alta entropía con medidor.
- **RF02** Solicitudes + **cubicación** automática.
- **RF03** Picking con **pesaje por bulto** y tara por proveedor.
- **RF04** Despacho: descuenta stock + **CSV Avesoft (P2)**.
- **RF05** Devoluciones: reingreso + **consumo real** + **CSV (P3)**.
- **RF06** Inventario con alertas de stock mínimo.
- **RF07 / 3.G4b** Sustitución activa (botón "Usar equivalente" en picking).
- **3.7** Panel de administración de materiales (productos/proveedores/recetas) + **Avesoft P1** (import/export catálogo).
- **Tutoriales** in-app: recorridos guiados (tour de bienvenida automático + 4 casos + botón "Ver tutorial" por página).

## 5. Reglas de negocio clave
- **Tara por proveedor:** Renner = 1 kg, otros = 2,5 kg. `M_neto = M_bruto − tara × nº_bultos`. (La tara no aplica a productos contados por unidad `un`.)
- **Cubicación:** `cantidad = cantidad_por_m2 × m² × (1 + holgura/100)`.
- **Consumo real:** `Σ despachado − Σ devuelto`.
- **Estados de solicitud:** `borrador → enviada → en_picking → despachada → cerrada`.
- **Roles:** `administrador`, `supervisor`, `jefe_bodega`, `operario_bodega`. (El admin puede recorrer todo el flujo.)
- **Sustitución:** `productos.sustituto_id` (auto-referencia); en picking se ofrece el equivalente ante quiebre.

## 6. Mapa del código
```
backend/app/
  main.py               # app + routers + lifespan (create_all + auto-seed si BD vacía)
  seed.py               # datos demo de feria (idempotente: solo si BD vacía)
  core/                 # config (env), security (JWT + política de clave), deps (roles), database
  models/               # usuario, invitacion, catalogo (producto/proveedor/receta/centro_costo), operaciones
  schemas/              # pydantic (usuario, catalogo, solicitud, operaciones, ...)
  crud/                 # usuario, invitacion, catalogo
  services/             # cubicacion, pesaje, avesoft (CSV P1/P2/P3), notificaciones (hook email), usuarios_import
  api/v1/               # auth, usuarios, invitaciones, catalogo, recetas, solicitudes, picking, despacho, devoluciones, stock
frontend/src/
  App.tsx               # auth + ruteo por estado `page` + tour de bienvenida
  services/api.ts       # cliente HTTP (JWT en localStorage), descargas CSV
  components/           # Sidebar, Layout, PasswordField, Tour, icons
  pages/                # Login, Dashboard, Solicitudes, NuevaSolicitud, Stock, Usuarios, Materiales,
                        #   Picking, Despacho, Devoluciones, AceptarInvitacion, Tutoriales
  tours.ts              # definición de los tutoriales (bienvenida + 4 casos)
```

## 7. Correr en local (otro PC)
Requisitos: Docker Desktop + Node (para build del front si se quiere).
1. Clonar el repo.
2. Crear **`backend/.env`** (está en `.gitignore`, no viene en el clon):
   ```
   SECRET_KEY=cualquier-valor-para-local
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   CORS_ORIGINS=http://localhost:5173
   ```
   (El `DATABASE_URL` local lo entrega `docker-compose.dev.yml`.)
3. Levantar:
   ```
   docker compose -f docker-compose.dev.yml up -d --build
   ```
   El backend **auto-siembra** los datos de feria al arrancar (BD vacía). Si hiciera falta forzarlo:
   `docker exec sistemadetrazabilidad-backend-1 python -m app.seed`
4. Front en `http://localhost:5173`, API en `http://localhost:8000` (docs en `/docs`). Login: `admin@grupolc.cl / admin1234`.
5. Para re-sembrar desde cero: `docker compose -f docker-compose.dev.yml down -v` y volver a `up`.

## 8. Despliegue — puntos importantes
- **Railway NO auto-despliega** en cada push. Hay que ir a **Railway → servicio backend → Deployments → ⋮ → Redeploy**. (Vercel sí auto-despliega el frontend.)
- **Variables en Railway (backend):**
  - `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (referencia al servicio Postgres)
  - `SECRET_KEY = <clave de 64 hex>` (generada; vive solo en Railway)
  - `CORS_ORIGINS = https://sistema-de-trazabilidad.vercel.app`
- **Variable en Vercel:** `VITE_API_URL = https://sistemadetrazabilidad-production.up.railway.app/api/v1`
- **Cargar/limpiar datos de feria en prod:** la BD ya tiene los datos. Para dejarla prístina de nuevo:
  1. Railway → Postgres → Data (query): `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`
  2. Redeploy del backend → `create_all` recrea tablas + **auto-seed** carga todo (admin + catálogo).
  El auto-seed solo corre si la BD está vacía.

## 9. Datos de feria (lo que está sembrado)
- **Proveedores:** Renner (tara 1.0), Importadora Duracon (2.5), Cuarzos del Pacífico (2.5).
- **14 productos** con códigos Avesoft reales (RESI55, RESI56, RESI56R, RESI62B, RESI10, RESI57, CUAR24B/29/31, DISO01A, BROC02, EPPL01, ROLL03, CMAS04).
- **Bajo mínimo (alertas):** RESI56, DISO01A, CMAS04.
- **Sustitución:** RESI56 (Duracon 205) → RESI56R (Rennerdur 420).
- **3 recetas:** MMA / Epóxico / Uretano.
- **3 obras:** Jumbo La Reina (CC-10563), Planta Maipú Norte, Bodega Pudahuel.
- **4 solicitudes:** 2 enviadas, 1 borrador, 1 cerrada. La **ENVIADA de Jumbo La Reina (MMA, 12 m²)** está lista para el picking en vivo (Caso 1).

## 10. Guion de demo (4 casos)
- **Caso 1 — Del pedido al consumo real (estrella):** Nueva solicitud (Jumbo, MMA, 12 m², +10%) → cubicación auto → Picking (pesa por bulto, tara auto) → Despacho (descuenta stock + CSV) → Devolución (consumo real). Cierre: `consumo = despachado − devuelto`.
- **Caso 2 — Quiebre y equivalente:** Inventario con RESI56 en rojo → en el picking sale el equivalente RESI56R con botón "Usar equivalente".
- **Caso 3 — Equipo:** Usuarios → invitar por enlace / carga CSV → el usuario crea su clave con medidor → roles.
- **Caso 4 — Avesoft:** Materiales → Importar/Exportar catálogo; CSV de despacho y devolución.

Todo esto está también como **Tutoriales guiados dentro de la app** (sidebar → Ayuda → Tutoriales) y en la **presentación** `presentacion-feria.html` (abrir en el navegador; `Ctrl+P` → Guardar como PDF).

## 11. Pendientes / riesgos para la feria
- **Crédito de Railway (~US$5 trial) = riesgo #1.** Se consume por tiempo encendido; si se agota, el backend cae. Recomendado **subir a plan Hobby (US$5/mes)** antes del evento. Los datos persisten; si se pierden, un redeploy los recarga.
- **Wifi del recinto:** tener **hotspot** de respaldo. Además dejar el **modo local con Docker** probado como red de seguridad.
- **Pre-warm:** abrir la web unos minutos antes de presentar (evitar cold start).
- **Reset final** de la BD (sección 8) justo antes de la feria si se practicó mucho, para llegar con datos limpios.
- **Post-feria / entrega real:** quitar o asegurar el admin demo (`admin@grupolc.cl / admin1234`), y migrar de `create_all`/auto-seed a **Alembic** para versionar el esquema.

## 12. Notas técnicas menores
- El tour de bienvenida se muestra **una vez por navegador** (flag `grupolc_welcome_seen` en `localStorage`). Para un kiosco que lo muestre a cada visitante: borrar ese flag o usar el botón "Ver tutorial" / la tarjeta "Recorrido general".
- Carga masiva de usuarios: columnas `nombre;email;rol` (hay plantilla descargable en Usuarios).
- Import de productos (Avesoft P1): `codigo_avesoft;descripcion;unidad_medida;proveedor;peso_tara_kg;stock_actual;stock_minimo;sustituto_id` (separador `;`, tolera coma decimal, idempotente).
