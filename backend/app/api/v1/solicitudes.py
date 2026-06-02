"""RF02 — Solicitud de pedidos y motor de cubicación."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogo import CentroCosto, Receta
from app.models.enums import EstadoSolicitud
from app.models.operaciones import Solicitud
from app.models.usuario import Usuario
from app.schemas.solicitud import (
    CubicarRequest,
    MaterialCalculadoOut,
    SolicitudCreate,
    SolicitudListItem,
)
from app.services.cubicacion import calcular_materiales

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


def _sistema_label(receta: Receta) -> str:
    return receta.descripcion or receta.nombre_sistema.value


def _to_list_item(solicitud: Solicitud) -> SolicitudListItem:
    return SolicitudListItem(
        id=solicitud.id,
        obra=solicitud.centro_costo.nombre_obra,
        sistema=_sistema_label(solicitud.receta),
        m2=float(solicitud.m2),
        estado=solicitud.estado,
        creado_at=solicitud.creado_at,
    )


async def _get_receta(db: AsyncSession, sistema_id: int) -> Receta:
    result = await db.execute(
        select(Receta).where(Receta.id == sistema_id).options(selectinload(Receta.detalle))
    )
    receta = result.scalar_one_or_none()
    if receta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receta (sistema de piso) no encontrada")
    return receta


async def _resolver_centro_costo(db: AsyncSession, obra: str) -> CentroCosto:
    """Busca el centro de costo por nombre de obra; si no existe, lo crea al vuelo."""
    obra = obra.strip()
    result = await db.execute(select(CentroCosto).where(CentroCosto.nombre_obra == obra))
    centro = result.scalar_one_or_none()
    if centro is None:
        total = (await db.execute(select(func.count()).select_from(CentroCosto))).scalar() or 0
        centro = CentroCosto(codigo=f"CC-{total + 1:03d}", nombre_obra=obra)
        db.add(centro)
        await db.flush()
    return centro


@router.get("", response_model=list[SolicitudListItem])
async def listar_solicitudes(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    result = await db.execute(
        select(Solicitud)
        .options(selectinload(Solicitud.centro_costo), selectinload(Solicitud.receta))
        .order_by(Solicitud.creado_at.desc())
    )
    return [_to_list_item(s) for s in result.scalars().all()]


@router.post("/cubicar", response_model=list[MaterialCalculadoOut])
async def cubicar_preview(
    data: CubicarRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    """Calcula los materiales sin crear la solicitud (preview del wizard)."""
    receta = await _get_receta(db, data.sistema_id)
    materiales = calcular_materiales(receta.detalle, data.m2, data.factor_holgura)
    return [
        MaterialCalculadoOut(producto_id=m.producto_id, cantidad_neta_kg=m.cantidad_neta_kg)
        for m in materiales
    ]


@router.post("", response_model=SolicitudListItem, status_code=status.HTTP_201_CREATED)
async def crear_solicitud(
    data: SolicitudCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[Usuario, Depends(get_current_user)],
):
    receta = await _get_receta(db, data.sistema_id)
    centro = await _resolver_centro_costo(db, data.obra)
    solicitud = Solicitud(
        supervisor_id=current.id,
        centro_costo_id=centro.codigo,
        m2=data.m2,
        sistema_id=data.sistema_id,
        factor_holgura=data.factor_holgura,
        presupuesto_aprobado=data.presupuesto_aprobado,
        estado=EstadoSolicitud.ENVIADA if data.presupuesto_aprobado else EstadoSolicitud.BORRADOR,
    )
    db.add(solicitud)
    await db.commit()
    await db.refresh(solicitud)
    # centro y receta ya están en sesión; construimos la vista de lista
    solicitud.centro_costo = centro
    solicitud.receta = receta
    return _to_list_item(solicitud)


@router.get("/{solicitud_id}/materiales", response_model=list[MaterialCalculadoOut])
async def materiales_solicitud(
    solicitud_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    result = await db.execute(select(Solicitud).where(Solicitud.id == solicitud_id))
    solicitud = result.scalar_one_or_none()
    if solicitud is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    receta = await _get_receta(db, solicitud.sistema_id)
    materiales = calcular_materiales(receta.detalle, solicitud.m2, float(solicitud.factor_holgura))
    return [
        MaterialCalculadoOut(producto_id=m.producto_id, cantidad_neta_kg=m.cantidad_neta_kg)
        for m in materiales
    ]
