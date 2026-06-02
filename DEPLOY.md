# Guía de Despliegue — Grupo LC

Arquitectura de producción (la correcta para este stack):

| Capa | Proveedor | Notas |
| --- | --- | --- |
| Frontend (PWA Vite) | **Vercel** | Estático, build de `frontend/` |
| Backend (FastAPI) | **Railway** | Contenedor Docker (`backend/Dockerfile`) |
| Base de datos | **Railway PostgreSQL** | Plugin gestionado, entrega `DATABASE_URL` |

> ⚠️ El backend **NO** va en Vercel (serverless, sin Postgres persistente). Vercel solo el frontend.

---

## Parte A — Backend + PostgreSQL en Railway

1. **railway.app** → *New Project* → *Deploy from GitHub repo* → elige `SistemaDeTrazabilidad`.
2. En el servicio creado: *Settings* → **Root Directory = `backend`** (así usa `backend/Dockerfile`).
3. *New* → *Database* → **Add PostgreSQL**. Railway crea la variable `DATABASE_URL`.
4. En el servicio backend → *Variables*, agrega:
   - `DATABASE_URL` → referencia a la del Postgres (`${{Postgres.DATABASE_URL}}`)
   - `SECRET_KEY` → genera uno: `python -c "import secrets; print(secrets.token_hex(32))"`
   - `CORS_ORIGINS` → la URL de Vercel (se completa en la Parte C; deja `*` provisional)
5. *Deploy*. Las tablas se crean solas al arrancar (lifespan en `main.py`).
6. **Datos demo (una vez):** en el servicio → *Shell* / *Run command*:
   ```
   python -m app.seed
   ```
7. Copia la **URL pública** del backend (ej. `https://backend-prod.up.railway.app`).
   Verifica `https://<backend>/health` → `{"status":"ok"}`.

## Parte B — Frontend en Vercel

1. **vercel.com** → *Add New Project* → importa `SistemaDeTrazabilidad`.
2. **Root Directory = `frontend`** (importante: evita que detecte el backend).
   El framework se autodetecta como **Vite** (ya hay `frontend/vercel.json`).
3. *Environment Variables*:
   - `VITE_API_URL` = `https://<backend>/api/v1` (la URL de Railway + `/api/v1`)
4. *Deploy*. Copia la URL de Vercel (ej. `https://sistema-trazabilidad.vercel.app`).

## Parte C — Conectar CORS

1. Vuelve a Railway → servicio backend → *Variables*:
   - `CORS_ORIGINS` = `https://sistema-trazabilidad.vercel.app`
   - (varios dominios → separados por coma)
2. Redeploy del backend.
3. Abre la URL de Vercel y entra con `admin@grupolc.cl` / `admin1234`.

---

## Notas

- `DATABASE_URL` puede venir como `postgresql://`; el backend lo convierte a
  `postgresql+asyncpg://` automáticamente (`app/core/config.py`).
- Para desarrollo local sigue usándose `docker-compose.dev.yml` (no cambia).
- Pendiente antes de producción real: migraciones con **Alembic** en lugar del
  `create_all` de arranque, y un usuario admin propio (no el de demo).
