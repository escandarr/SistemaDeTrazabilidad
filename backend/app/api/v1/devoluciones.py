"""RF05 — Devoluciones: pesaje del material que vuelve de obra.

Reingresa el peso neto al inventario, cierra la solicitud y genera el CSV
del Punto de Integración 3 (reingreso en Avesoft).
Consumo real = Σ despachado − Σ devuelto (ecuación 2).
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
from app.models.catalogo import Producto
from app.models.enums import EstadoSolicitud, RolUsuario
from app.models.operaciones import (
    Despacho,
    Devolucion,
    DevolucionItem,
    Picking,
    PickingItem,
    Solicitud,
)
from app.models.usuario import Usuario
from app.schemas.operaciones import (
    CrearDevolucionRequest,
    DevolucionAbierta,
    DevolucionAbiertaItem,
    DevolucionRow,
)
from app.services.avesoft import generar_csv
from app.services.pesaje import calcular_peso_neto, consumo_neto_real, tara_unitaria

router = APIRouter(prefix="/devoluciones", tags=["devoluciones"])

BodegaDep = Annotated[
    Usuario,
    Depends(require_roles(RolUsuario.ADMINISTRADOR, RolUsuario.JEFE_BODEGA, RolUsuario.OPERARIO_BODEGA)),
]

_OPCIONES_DEVOLUCION = (
    selectinload(Devolucion.items).selectinload(DevolucionItem.producto),
    selectinload(Devolucion.despacho).selectinload(Despacho.picking).selectinload(Picking.items),
    selectinload(Devolucion.despacho)
    .selectinload(Despacho.picking)
    .selectinload(Picking.solicitud)
    .selectinload(Solicitud.centro_costo),
)


def _total_despachado(picking: Picking) -> float:
    return round(sum(float(i.peso_neto or 0) for i in picking.items), 3)


def _total_devuelto(devolucion: Devolucion) -> float:
    return round(sum(float(i.peso_neto or 0) for i in devolucion.items), 3)


def _row(dv: Devolucion) -> DevolucionRow:
    solicitud = dv.despacho.picking.solicitud
    devuelto = _total_devuelto(dv)
    return DevolucionRow(
        id=dv.id,
        despacho_id=dv.despacho_id,
        solicitud_id=solicitud.id,
        obra=solicitud.centro_costo.nombre_obra,
        fecha=dv.fecha_registro,
        total_devuelto_kg=devuelto,
        consumo_real_kg=consumo_neto_real(_total_despachado(dv.despacho.picking), devuelto),
    )


@router.get("/abiertos", response_model=list[DevolucionAbierta])
async def despachos_abiertos(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    """Despachos cuya solicitud sigue abierta: pueden recibir material de vuelta."""
    result = await db.execute(
        select(Despacho)
        .join(Despacho.picking)
        .join(Picking.solicitud)
        .where(Solicitud.estado == EstadoSolicitud.DESPACHADA)
        .options(
            selectinload(Despacho.picking)
            .selectinload(Picking.items)
            .selectinload(PickingItem.producto)
            .selectinload(Producto.proveedor),
            selectinload(Despacho.picking)
            .selectinload(Picking.solicitud)
            .selectinload(Solicitud.centro_costo),
        )
        .order_by(Despacho.id.asc())
    )
    abiertos = []
    for d in result.scalars().all():
        abiertos.append(
            DevolucionAbierta(
                despacho_id=d.id,
                solicitud_id=d.picking.solicitud.id,
                obra=d.picking.solicitud.centro_costo.nombre_obra,
                fecha_despacho=d.fecha_procesado,
                items=[
                    DevolucionAbiertaItem(
                        producto_id=i.producto_id,
                        descripcion=i.producto.descripcion,
                        unidad=i.producto.unidad_medida.value,
                        despachado_kg=float(i.peso_neto or 0),
                        tara_unitaria=tara_unitaria(i.producto),
                    )
                    for i in d.picking.items
                ],
            )
        )
    return abiertos


@router.get("", response_model=list[DevolucionRow])
async def listar_devoluciones(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    result = await db.execute(
        select(Devolucion).options(*_OPCIONES_DEVOLUCION).order_by(Devolucion.id.desc())
    )
    return [_row(dv) for dv in result.scalars().all()]


@router.post("", response_model=DevolucionRow, status_code=status.HTTP_201_CREATED)
async def registrar_devolucion(
    data: CrearDevolucionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    result = await db.execute(
        select(Despacho)
        .where(Despacho.id == data.despacho_id)
        .options(
            selectinload(Despacho.picking)
            .selectinload(Picking.items)
            .selectinload(PickingItem.producto)
            .selectinload(Producto.proveedor),
            selectinload(Despacho.picking).selectinload(Picking.solicitud),
        )
    )
    despacho = result.scalar_one_or_none()
    if despacho is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Despacho no encontrado")
    solicitud = despacho.picking.solicitud
    if solicitud.estado != EstadoSolicitud.DESPACHADA:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La solicitud ya fue cerrada")

    despachado_por_producto = {
        i.producto_id: (i, float(i.peso_neto or 0)) for i in despacho.picking.items
    }

    devolucion = Devolucion(despacho_id=despacho.id, guia_ingreso_ref=data.guia_ref)
    for item_req in data.items:
        entrada = despachado_por_producto.get(item_req.producto_id)
        if entrada is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"El producto {item_req.producto_id} no fue parte de este despacho",
            )
        picking_item, despachado = entrada
        if any(p <= 0 for p in item_req.pesos_bultos):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cada pesada debe ser mayor que cero")

        tara_unit = tara_unitaria(picking_item.producto)
        bruto = round(sum(item_req.pesos_bultos), 3)
        tara_total = round(tara_unit * len(item_req.pesos_bultos), 3)
        neto = calcular_peso_neto(bruto, tara_total)
        if neto <= 0:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"{item_req.producto_id}: el neto resulta {neto} kg, no cubre la tara ({tara_unit} kg por bulto)",
            )
        if neto > despachado:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"{item_req.producto_id}: no puede volver más de lo despachado ({neto} > {despachado} kg)",
            )

        devolucion.items.append(
            DevolucionItem(
                producto_id=item_req.producto_id,
                peso_bruto=bruto,
                peso_tara=tara_total,
                peso_neto=neto,
            )
        )
        # Reingreso al inventario por peso neto real.
        picking_item.producto.stock_actual = float(picking_item.producto.stock_actual) + neto

    solicitud.estado = EstadoSolicitud.CERRADA
    db.add(devolucion)
    await db.flush()
    devolucion.ruta_archivo_csv = f"avesoft/devolucion_{devolucion.id}.csv"
    await db.commit()

    result = await db.execute(
        select(Devolucion).where(Devolucion.id == devolucion.id).options(*_OPCIONES_DEVOLUCION)
    )
    return _row(result.scalar_one())


@router.get("/{devolucion_id}/csv")
async def csv_devolucion(
    devolucion_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: BodegaDep,
):
    """Punto de Integración 3: CSV de reingreso neto para Avesoft."""
    result = await db.execute(
        select(Devolucion).where(Devolucion.id == devolucion_id).options(*_OPCIONES_DEVOLUCION)
    )
    dv = result.scalar_one_or_none()
    if dv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Devolución no encontrada")
    solicitud = dv.despacho.picking.solicitud
    fecha = (dv.fecha_registro or datetime.now(timezone.utc)).date().isoformat()
    filas = [
        {
            "codigo_producto": i.producto_id,
            "descripcion": i.producto.descripcion,
            "cantidad": f"{float(i.peso_neto or 0):.3f}",
            "unidad": i.producto.unidad_medida.value,
            "tipo_movimiento": "ENTRADA",
            "centro_costo": solicitud.centro_costo_id,
            "obra": solicitud.centro_costo.nombre_obra,
            "referencia": f"SOL-{solicitud.id:03d}",
            "fecha": fecha,
        }
        for i in dv.items
    ]
    return Response(
        content=generar_csv(filas),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="devolucion_{dv.id}.csv"'},
    )
