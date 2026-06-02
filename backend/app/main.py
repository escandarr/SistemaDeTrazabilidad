from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 — registra las entidades en Base.metadata
from app.api.v1 import auth, despacho, devoluciones, picking, recetas, solicitudes, stock
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Crea las tablas que falten al iniciar (idempotente). Para versionar el
    # esquema en producción se migrará a Alembic.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Sistema de Trazabilidad Grupo LC", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, recetas.router, solicitudes.router, picking.router, despacho.router, devoluciones.router, stock.router]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
