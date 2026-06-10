"""RF04 — Despacho: salida formal de bodega y Punto de Integración 2 (Avesoft).

El despacho descuenta stock por peso neto pesado y deja disponible el CSV
batch que administración importa en Avesoft para emitir la guía.
"""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.catalogo import Receta
from app.models.enums import EstadoPicking, EstadoSolicitud, RolUsuario
from app.models.operaciones import Despacho, Picking, PickingItem, Solicitud
from app.models.usuario import Usuario
from app.schemas.operaciones import (
    CrearDespachoRequest,
    DespachoItemOut,
    DespachoPendiente,
    DespachoRow,
)
from app.services.avesoft import generar_csv

router = APIRouter(prefix="/despacho", tags=["despacho"])

JefeDep = Annotated[
    Usuario,
    Depends(require_roles(RolUsuario.ADMINISTRADOR, RolUsuario.JEFE_BODEGA)),
]

_OPCIONES_DESPACHO = (
    selectinload(Despacho.picking).selectinload(Picking.items).selectinload(PickingItem.producto),
    selectinload(Despacho.picking).selectinload(Picking.solicitud).selectinload(Solicitud.centro_costo),
    selectinload(Despacho.picking).selectinload(Picking.solicitud).selectinload(Solicitud.receta),
    selectinload(Despacho.devoluciones),
)


def _sistema_label(receta: Receta) -> str:
    return receta.descripcion or receta.nombre_sistema.value


def _total_neto(picking: Picking) -> float:
    return round(sum(float(i.peso_neto or 0) for i in picking.items), 3)


def _row(d: Despacho) -> DespachoRow:
    solicitud = d.picking.solicitud
    return DespachoRow(
        id=d.id,
        solicitud_id=solicitud.id,
        obra=solicitud.centro_costo.nombre_obra,
        sistema=_sistema_label(solicitud.receta),
        fecha=d.fecha_procesado,
        total_neto_kg=_total_neto(d.picking),
        guia_avesoft_ref=d.guia_avesoft_ref,
        estado_solicitud=solicitud.estado,
        tiene_devolucion=len(d.devoluciones) > 0,
    )


async def _get_despacho(db: AsyncSession, despacho_id: int) -> Despacho:
    result = await db.execute(
        select(Despacho).where(Despacho.id == despacho_id).options(*_OPCIONES_DESPACHO)
    )
    despacho = result.scalar_one_or_none()
    if despacho is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Despacho no encontrado")
    return despacho


@router.get("/pendientes", response_model=list[DespachoPendiente])
async def pickings_listos(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: JefeDep,
):
    """Pickings confirmados que aún no tienen salida formal."""
    result = await db.execute(
        select(Picking)
        .where(Picking.estado == EstadoPicking.CONFIRMADO, ~Picking.despacho.has())
        .options(
            selectinload(Picking.items).selectinload(PickingItem.producto),
            selectinload(Picking.solicitud).selectinload(Solicitud.centro_costo),
            selectinload(Picking.solicitud).selectinload(Solicitud.receta),
        )
        .order_by(Picking.creado_at.asc())
    )
    pendientes = []
    for p in result.scalars().all():
        pendientes.append(
            DespachoPendiente(
                picking_id=p.id,
                solicitud_id=p.solicitud.id,
                obra=p.solicitud.centro_costo.nombre_obra,
                sistema=_sistema_label(p.solicitud.receta),
                total_neto_kg=_total_neto(p),
                items=[
                    DespachoItemOut(
                        producto_id=i.producto_id,
                        descripcion=i.producto.descripcion,
                        unidad=i.producto.unidad_medida.value,
                        peso_neto=float(i.peso_neto or 0),
                    )
                    for i in p.items
                ],
            )
        )
    return pendientes


@router.get("", response_model=list[DespachoRow])
async def listar_despachos(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: JefeDep,
):
    result = await db.execute(
        select(Despacho).options(*_OPCIONES_DESPACHO).order_by(Despacho.id.desc())
    )
    return [_row(d) for d in result.scalars().all()]


@router.post("", response_model=DespachoRow, status_code=status.HTTP_201_CREATED)
async def crear_despacho(
    data: CrearDespachoRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: JefeDep,
):
    result = await db.execute(
        select(Picking)
        .where(Picking.id == data.picking_id)
        .options(
            selectinload(Picking.items).selectinload(PickingItem.producto),
            selectinload(Picking.solicitud),
            selectinload(Picking.despacho),
        )
    )
    picking = result.scalar_one_or_none()
    if picking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Picking no encontrado")
    if picking.estado != EstadoPicking.CONFIRMADO:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El picking debe estar confirmado antes de despachar")
    if picking.despacho is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "El picking ya fue despachado")

    despacho = Despacho(
        picking_id=picking.id,
        guia_avesoft_ref=data.guia_ref,
        fecha_procesado=datetime.now(timezone.utc),
    )
    db.add(despacho)

    # Salida de inventario: descuenta el peso neto real de cada producto.
    for item in picking.items:
        item.producto.stock_actual = float(item.producto.stock_actual) - float(item.peso_neto or 0)

    picking.solicitud.estado = EstadoSolicitud.DESPACHADA
    await db.flush()
    despacho.ruta_archivo_csv = f"avesoft/despacho_{despacho.id}.csv"
    await db.commit()

    return _row(await _get_despacho(db, despacho.id))


@router.get("/{despacho_id}/csv")
async def csv_despacho(
    despacho_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: JefeDep,
):
    """Punto de Integración 2: CSV de consumos por centro de costo para Avesoft."""
    d = await _get_despacho(db, despacho_id)
    solicitud = d.picking.solicitud
    fecha = (d.fecha_procesado or datetime.now(timezone.utc)).date().isoformat()
    filas = [
        {
            "codigo_producto": i.producto_id,
            "descripcion": i.producto.descripcion,
            "cantidad": f"{float(i.peso_neto or 0):.3f}",
            "unidad": i.producto.unidad_medida.value,
            "tipo_movimiento": "SALIDA",
            "centro_costo": solicitud.centro_costo_id,
            "obra": solicitud.centro_costo.nombre_obra,
            "referencia": f"SOL-{solicitud.id:03d}",
            "fecha": fecha,
        }
        for i in d.picking.items
    ]
    return Response(
        content=generar_csv(filas),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="despacho_{d.id}.csv"'},
    )


@router.post("/{despacho_id}/cerrar", response_model=DespachoRow)
async def cerrar_sin_devolucion(
    despacho_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: JefeDep,
):
    """Cierra la solicitud cuando la obra consumió todo (no vuelve material)."""
    d = await _get_despacho(db, despacho_id)
    solicitud = d.picking.solicitud
    if solicitud.estado != EstadoSolicitud.DESPACHADA:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La solicitud no está en estado despachada")
    solicitud.estado = EstadoSolicitud.CERRADA
    await db.commit()
    return _row(await _get_despacho(db, despacho_id))
