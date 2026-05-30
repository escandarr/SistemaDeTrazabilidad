"""RF02 — Solicitud de pedidos y motor de cubicación."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogo import Receta
from app.models.enums import EstadoSolicitud
from app.models.operaciones import Solicitud
from app.models.usuario import Usuario
from app.schemas.solicitud import MaterialCalculadoOut, SolicitudCreate, SolicitudRead
from app.services.cubicacion import calcular_materiales

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


async def _get_receta(db: AsyncSession, sistema_id: int) -> Receta:
    result = await db.execute(
        select(Receta).where(Receta.id == sistema_id).options(selectinload(Receta.detalle))
    )
    receta = result.scalar_one_or_none()
    if receta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receta (sistema de piso) no encontrada")
    return receta


async def _get_solicitud(db: AsyncSession, solicitud_id: int) -> Solicitud:
    result = await db.execute(select(Solicitud).where(Solicitud.id == solicitud_id))
    solicitud = result.scalar_one_or_none()
    if solicitud is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    return solicitud


@router.post("", response_model=SolicitudRead, status_code=status.HTTP_201_CREATED)
async def crear_solicitud(
    data: SolicitudCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[Usuario, Depends(get_current_user)],
):
    await _get_receta(db, data.sistema_id)  # valida que el sistema exista
    solicitud = Solicitud(
        supervisor_id=current.id,
        centro_costo_id=data.centro_costo_id,
        m2=data.m2,
        sistema_id=data.sistema_id,
        factor_holgura=data.factor_holgura,
        presupuesto_aprobado=data.presupuesto_aprobado,
        # Solo se "envía" si el presupuesto está aprobado (RF02).
        estado=EstadoSolicitud.ENVIADA if data.presupuesto_aprobado else EstadoSolicitud.BORRADOR,
    )
    db.add(solicitud)
    await db.commit()
    await db.refresh(solicitud)
    return solicitud


@router.get("/{solicitud_id}", response_model=SolicitudRead)
async def obtener_solicitud(
    solicitud_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    return await _get_solicitud(db, solicitud_id)


@router.get("/{solicitud_id}/materiales", response_model=list[MaterialCalculadoOut])
async def materiales_solicitud(
    solicitud_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    """Cubicación: desglose neto de materiales en kg para esta solicitud."""
    solicitud = await _get_solicitud(db, solicitud_id)
    receta = await _get_receta(db, solicitud.sistema_id)
    materiales = calcular_materiales(receta.detalle, solicitud.m2, float(solicitud.factor_holgura))
    return [
        MaterialCalculadoOut(producto_id=m.producto_id, cantidad_neta_kg=m.cantidad_neta_kg)
        for m in materiales
    ]
