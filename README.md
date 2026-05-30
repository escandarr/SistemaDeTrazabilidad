# Sistema de Gestión de Inventario — Grupo LC

Plataforma web (PWA) para digitalizar el ciclo completo de materias primas en obras de instalación de pisos industriales. Desarrollado como proyecto académico para la empresa **Grupo LC** en el marco del curso Proyectos TICs 2 — UDP.

---

## Problema que resuelve

Grupo LC opera con pedidos por WhatsApp/papel, pesaje manual de tinetas y sin vinculación entre pedido-despacho-devolución. Esto genera diferencias de stock de **30–40 kg/mes**. El ERP existente (Avesoft) solo cubre ingreso/salida básico, sin picking ni flujo completo.

---

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + TypeScript (PWA via Vite) |
| Backend | FastAPI (Python 3.12) |
| Base de datos | PostgreSQL 16 |
| Migraciones | Alembic (async) |
| Autenticación | JWT + bcrypt |
| Infraestructura | Microsoft Azure (contenedores, TLS 1.3) |
| Integración ERP | Archivos CSV batch asíncrono ↔ Avesoft (sin API) |

---

## Módulos del sistema

| # | Módulo | Descripción |
| --- | --- | --- |
| 1 | Autenticación y roles | Admin, Supervisor, Operario bodega, Jefe bodega |
| 2 | Solicitud de pedidos | Supervisor elige sistema de piso + m², el sistema calcula materiales con recetas configurables |
| 3 | Picking | Bodega alista, pesa tinetas, descuenta tara automáticamente por proveedor |
| 4 | Despacho | Genera CSV → Avesoft emite guía de despacho SII |
| 5 | Devoluciones | Registro de sobrantes con pesaje, genera CSV de ingreso → Avesoft |
| 6 | Stock y alertas | Stock mínimo, alertas push, historial por centro de costo |

---

## Requerimientos funcionales

| ID | Descripción |
| --- | --- |
| RF01 | Autenticación con roles diferenciados |
| RF02 | Creación de solicitudes de pedido |
| RF03 | Cálculo automático de materiales por receta |
| RF04 | Picking con pesaje y descuento de tara por proveedor |
| RF05 | Despacho y generación de guía electrónica |
| RF06 | Registro de devoluciones con pesaje |
| RF07 | Alertas de stock mínimo |
| RF08 | Historial y trazabilidad por centro de costo |

## Requerimientos no funcionales

| ID | Descripción |
| --- | --- |
| RNF01 | Disponibilidad 99.5% |
| RNF02 | Seguridad: bcrypt, sesión 60 min |
| RNF03 | Usabilidad validada con usuarios reales |
| RNF04 | Performance adecuado para uso en obra |
| RNF05 | Integrable con Avesoft vía CSV/XML |

---

## Estructura del repositorio

```text
SistemaDeTrazabilidad/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Routers: auth, solicitudes, picking, despacho, devoluciones, stock
│   │   ├── core/            # config.py, database.py, security.py
│   │   ├── models/          # SQLAlchemy ORM (usuario, catalogo, operaciones)
│   │   ├── schemas/         # Pydantic v2
│   │   ├── services/        # Lógica de negocio: cubicación + pesaje
│   │   ├── crud/
│   │   └── main.py          # FastAPI app + CORS + /health
│   ├── alembic/             # Migraciones de base de datos
│   ├── requirements.txt
│   └── .env                 # Variables de entorno (no commiteado)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/        # Llamadas a la API
│   │   ├── store/           # Zustand
│   │   └── types/
│   └── vite.config.ts       # PWA + proxy /api → :8000
├── docker-compose.dev.yml
└── README.md
```

---

## Modelo de datos

Entidades principales (ver [backend/app/models/](backend/app/models/)):

- **Maestros** ([catalogo.py](backend/app/models/catalogo.py)): `proveedores`, `productos`, `recetas`, `receta_detalle`, `centros_costo`
- **Operaciones** ([operaciones.py](backend/app/models/operaciones.py)): `solicitudes`, `pickings`, `picking_items`, `despachos`, `devoluciones`, `devolucion_items`
- **Acceso** ([usuario.py](backend/app/models/usuario.py)): `usuarios`

### Máquina de estados de una solicitud

```text
Borrador → Enviada → En Picking → Despachada → Cerrada
```

### Lógica de negocio clave

Implementada en [backend/app/services/](backend/app/services/):

| Cálculo | Fórmula | Archivo |
| --- | --- | --- |
| Cubicación de materiales | `cantidad = cantidad_por_m2 × m² × (1 + holgura/100)` | [cubicacion.py](backend/app/services/cubicacion.py) |
| Peso neto (descuento de tara) | `M_neto = M_bruto − M_tara(proveedor)` | [pesaje.py](backend/app/services/pesaje.py) |
| Consumo real de obra | `Consumo = Σ Despachado − Σ Devuelto` | [pesaje.py](backend/app/services/pesaje.py) |

La tara se resuelve por producto (override) o, si es NULL, por proveedor (ej.: Renner −1 kg; otros −2,5 kg).

## Integración con Avesoft

Avesoft **no expone API** — la integración es por archivos CSV en modo batch asíncrono. Tres puntos de conexión:

| Punto | Dirección | Disparador y acción |
| --- | --- | --- |
| P1 — Maestro de insumos | Avesoft → Plataforma | Cronjob nocturno: importa catálogo y stocks de referencia |
| P2 — Salidas de bodega | Plataforma → Avesoft | Al cerrar picking: CSV de consumos → guía de despacho SII + cargo a centro de costo |
| P3 — Retornos y mermas | Plataforma → Avesoft | Al cierre de obra: CSV de reingreso → guía de ingreso por devolución |

> Contacto técnico de integración: **Alfredo** (uno de los creadores de Avesoft). Próxima reunión de definición del picking: jueves 30/05/2026, 10:00.

## Levantar en desarrollo

**Requisitos:** Docker Desktop instalado.

```bash
# 1. Copiar y editar variables de entorno
cp backend/.env.example backend/.env
# Reemplazar SECRET_KEY con: python -c "import secrets; print(secrets.token_hex(32))"

# 2. Levantar los 3 servicios
docker compose -f docker-compose.dev.yml up

# Servicios disponibles:
# - Frontend:  http://localhost:5173
# - Backend:   http://localhost:8000
# - API Docs:  http://localhost:8000/docs
# - DB:        localhost:5432
```

**Sin Docker (desarrollo local):**

```bash
# Backend
cd backend
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Variables de entorno

`backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://grupolc:password@localhost:5432/trazabilidad
SECRET_KEY=<generar con secrets.token_hex(32)>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

`frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Migraciones de base de datos

```bash
cd backend

# Crear nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1
```

---

## Equipo

| Nombre | Rol |
| --- | --- |
| Benjamín Escandar | Desarrollo |
| Raúl Slater | Desarrollo |
| Nicolás Cerda | Desarrollo |
| Benjamín Rivera | Desarrollo |

**Contactos cliente:**

- José Luis — Operaciones (flujo de procesos)
- Alejandro López — Jefe de bodega (usuario final)
- Alfredo (Avesoft) — Integración ERP

---

## Estado del proyecto (mayo 2026)

- [x] Acta de constitución
- [x] Kickoff
- [x] Documento de diseño de la solución (RF, RNF, arquitectura)
- [x] Flujo BPMN
- [x] EDT + Gantt
- [x] Setup inicial del repositorio
- [x] Modelo de datos completo (10 entidades) + servicios de cubicación/pesaje
- [x] Módulo core: autenticación (RF01) + solicitudes con cubicación (RF02)
- [ ] Diagrama de red CPM (en proceso)
- [ ] Módulos picking, despacho, devoluciones (RF03–RF05)
- [ ] Integración Avesoft (CSV P1/P2/P3)
- [ ] Pruebas y validación con usuarios
