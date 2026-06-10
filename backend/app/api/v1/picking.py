"""RF03 — Picking con pesaje en báscula y deducción de tara.

Flujo: solicitud ENVIADA → iniciar picking (items desde la cubicación) →
pesar cada producto por bulto → confirmar (jefe de bodega).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.catalogo import Producto, Receta
from app.models.enums import EstadoPicking, EstadoSolicitud, RolUsuario
from app.models.operaciones import Picking, PickingItem, Solicitud
from app.models.usuario import Usuario
from app.schemas.operaciones import (
    IniciarPickingRequest,
    PesajeRequest,
    PickingDetail,
    PickingItemOut,
    PickingRow,
)
from app.services.cubicacion import calcular_materiales
from app.services.pesaje import calcular_peso_neto, tara_unitaria

router = APIRouter(prefix="/picking", tags=["picking"])

BodegaDep = Annotated[
    Usuario,
    Depends(require_roles(RolUsuario.ADMINISTRADOR, RolUsuario.JEFE_BODEGA, RolUsuario.OPERARIO_BODEGA)),
]
JefeDep = Annotated[
    Usuario,
    Depends(require_roles(RolUsuario.ADMINISTRADOR, RolUsuario.JEFE_BODEGA)),
]

_OPCIONES_SOLICITUD = (
    selectinload(Solicitud.centro_costo),
    selectinload(Solicitud.receta),
    selectinload(Solicitud.picking).selectinload(Picking.items).selectinload(PickingItem.producto).selectinload(Producto.proveedor),
)


def _sistema_label(receta: Receta) -> str:
    return receta.descripcion or receta.nombre_sistema.value


def _item_out(item: PickingItem) -> PickingItemOut:
    return PickingItemOut(
        id=item.id,
        producto_id=item.producto_id,
        descripcion=item.producto.descripcion,
        unidad=item.producto.unidad_medida.value,
        cantidad_teorica=float(item.cantidad_teorica) if item.cantidad_teorica is not None else None,
        tara_unitaria=tara_unitaria(item.producto),
        peso_bruto=float(item.peso_bruto) if item.peso_bruto is not None else None,
        peso_tara=float(item.peso_tara) if item.peso_tara is not None else None,
        peso_neto=float(item.peso_neto) if item.peso_neto is not None else None,
    )


def _detail(picking: Picking, solicitud: Solicitud) -> PickingDetail:
    return PickingDetail(
        id=picking.id,
        solicitud_id=solicitud.id,
        obra=solicitud.centro_costo.nombre_obra,
        sistema=_sistema_label(solicitud.receta),
        estado=picking.estado,
        items=[_item_out(i) for i in picking.items],
    )


async def _get_picking(db: AsyncSession, picking_id: int) -> tuple[Picking, Solicitud]:
    result = await db.execute(
        select(Picking)
        .where(Picking.id == picking_id)
        .options(
            selectinload(Picking.items).selectinload(PickingItem.producto).selectinload(Producto.proveedor),
            selectinload(Picking.solicitud).selectinload(Solicitud.centro_costo),
            selectinload(Picking.solicitud).selectinload(Solicitud.receta),
        )
    )
    picking = result.scalar_one_or_none()
    if picking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Picking no encontrado")
    return picking, picking.solicitud


@router.get("", response_model=list[PickingRow])
async def listar_picking(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    """Solicitudes enviadas (por iniciar) y pickings en curso o confirmados sin despachar."""
    result = await db.execute(
        select(Solicitud)
        .where(Solicitud.estado.in_([EstadoSolicitud.ENVIADA, EstadoSolicitud.EN_PICKING]))
        .options(*_OPCIONES_SOLICITUD)
        .order_by(Solicitud.creado_at.asc())
    )
    filas = []
    for s in result.scalars().all():
        filas.append(
            PickingRow(
                solicitud_id=s.id,
                picking_id=s.picking.id if s.picking else None,
                obra=s.centro_costo.nombre_obra,
                sistema=_sistema_label(s.receta),
                m2=float(s.m2),
                estado_solicitud=s.estado,
                estado_picking=s.picking.estado if s.picking else None,
            )
        )
    return filas


@router.post("/iniciar", response_model=PickingDetail, status_code=status.HTTP_201_CREATED)
async def iniciar_picking(
    data: IniciarPickingRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    result = await db.execute(
        select(Solicitud)
        .where(Solicitud.id == data.solicitud_id)
        .options(
            selectinload(Solicitud.centro_costo),
            selectinload(Solicitud.receta).selectinload(Receta.detalle),
            selectinload(Solicitud.picking),
        )
    )
    solicitud = result.scalar_one_or_none()
    if solicitud is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    if solicitud.picking is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "La solicitud ya tiene un picking iniciado")
    if solicitud.estado != EstadoSolicitud.ENVIADA:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Solo se puede iniciar picking de solicitudes enviadas")

    materiales = calcular_materiales(
        solicitud.receta.detalle, float(solicitud.m2), float(solicitud.factor_holgura)
    )
    picking = Picking(
        solicitud_id=solicitud.id,
        items=[
            PickingItem(producto_id=m.producto_id, cantidad_teorica=m.cantidad_neta_kg)
            for m in materiales
        ],
    )
    solicitud.estado = EstadoSolicitud.EN_PICKING
    db.add(picking)
    await db.commit()

    picking, solicitud = await _get_picking(db, picking.id)
    return _detail(picking, solicitud)


@router.get("/{picking_id}", response_model=PickingDetail)
async def detalle_picking(
    picking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    picking, solicitud = await _get_picking(db, picking_id)
    return _detail(picking, solicitud)


@router.put("/{picking_id}/items/{item_id}", response_model=PickingItemOut)
async def pesar_item(
    picking_id: int,
    item_id: int,
    data: PesajeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    """Registra las pesadas de báscula de un producto (un valor por bulto).

    M_neto = Σ M_bruto − tara × n_bultos (ecuación 1 del documento de diseño).
    """
    picking, _solicitud = await _get_picking(db, picking_id)
    if picking.estado == EstadoPicking.CONFIRMADO:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El picking ya fue confirmado")

    item = next((i for i in picking.items if i.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ítem no encontrado en este picking")
    if any(p <= 0 for p in data.pesos_bultos):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cada pesada debe ser mayor que cero")

    tara_unit = tara_unitaria(item.producto)
    bruto = round(sum(data.pesos_bultos), 3)
    tara_total = round(tara_unit * len(data.pesos_bultos), 3)
    neto = calcular_peso_neto(bruto, tara_total)
    if neto <= 0:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"El peso neto resulta {neto} kg: las pesadas no cubren la tara ({tara_unit} kg por bulto)",
        )

    item.peso_bruto = bruto
    item.peso_tara = tara_total
    item.peso_neto = neto
    await db.commit()
    await db.refresh(item)
    return _item_out(item)


@router.post("/{picking_id}/confirmar", response_model=PickingDetail)
async def confirmar_picking(
    picking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    jefe: JefeDep,
):
    """Validación del jefe de bodega: deja el picking listo para despacho."""
    picking, solicitud = await _get_picking(db, picking_id)
    if picking.estado == EstadoPicking.CONFIRMADO:
        raise HTTPException(status.HTTP_409_CONFLICT, "El picking ya fue confirmado")
    sin_pesar = [i.producto_id for i in picking.items if i.peso_neto is None]
    if sin_pesar:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Faltan productos por pesar: {', '.join(sin_pesar)}",
        )
    picking.estado = EstadoPicking.CONFIRMADO
    picking.confirmado_por = jefe.id
    await db.commit()

    picking, solicitud = await _get_picking(db, picking_id)
    return _detail(picking, solicitud)
