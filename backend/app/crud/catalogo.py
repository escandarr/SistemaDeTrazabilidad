"""CRUD del catálogo maestro: productos, proveedores y recetas.

Incluye el upsert del maestro de productos para la importación batch (Avesoft P1).
"""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalogo import Producto, Proveedor, Receta, RecetaDetalle
from app.models.operaciones import DevolucionItem, PickingItem
from app.schemas.catalogo import (
    ImportResult,
    ProductoCreate,
    ProductoUpdate,
    ProveedorCreate,
    ProveedorUpdate,
    RecetaCreate,
    RecetaUpdate,
)
from app.services.avesoft import MaestroParseado


# --- Proveedores -------------------------------------------------------------

async def list_proveedores(db: AsyncSession) -> list[Proveedor]:
    result = await db.execute(select(Proveedor).order_by(Proveedor.nombre))
    return list(result.scalars().all())


async def get_proveedor(db: AsyncSession, proveedor_id: int) -> Proveedor | None:
    return await db.get(Proveedor, proveedor_id)


async def get_proveedor_by_nombre(db: AsyncSession, nombre: str) -> Proveedor | None:
    result = await db.execute(
        select(Proveedor).where(func.lower(Proveedor.nombre) == nombre.strip().lower())
    )
    return result.scalar_one_or_none()


async def create_proveedor(db: AsyncSession, data: ProveedorCreate) -> Proveedor:
    prov = Proveedor(nombre=data.nombre, peso_tara_kg=data.peso_tara_kg)
    db.add(prov)
    await db.commit()
    await db.refresh(prov)
    return prov


async def update_proveedor(db: AsyncSession, prov: Proveedor, data: ProveedorUpdate) -> Proveedor:
    if data.nombre is not None:
        prov.nombre = data.nombre
    if data.peso_tara_kg is not None:
        prov.peso_tara_kg = data.peso_tara_kg
    await db.commit()
    await db.refresh(prov)
    return prov


async def proveedor_en_uso(db: AsyncSession, proveedor_id: int) -> bool:
    total = await db.scalar(
        select(func.count()).select_from(Producto).where(Producto.proveedor_id == proveedor_id)
    )
    return bool(total)


async def delete_proveedor(db: AsyncSession, prov: Proveedor) -> None:
    await db.delete(prov)
    await db.commit()


# --- Productos ---------------------------------------------------------------

async def list_productos(db: AsyncSession) -> list[Producto]:
    result = await db.execute(select(Producto).order_by(Producto.descripcion))
    return list(result.scalars().all())


async def get_producto(db: AsyncSession, codigo: str) -> Producto | None:
    return await db.get(Producto, codigo)


async def create_producto(db: AsyncSession, data: ProductoCreate) -> Producto:
    prod = Producto(**data.model_dump())
    db.add(prod)
    await db.commit()
    await db.refresh(prod)
    return prod


async def update_producto(db: AsyncSession, prod: Producto, data: ProductoUpdate) -> Producto:
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(prod, campo, valor)
    await db.commit()
    await db.refresh(prod)
    return prod


async def producto_en_uso(db: AsyncSession, codigo: str) -> bool:
    """True si el producto está referenciado por recetas, pickings, devoluciones o como sustituto."""
    for modelo, columna in (
        (RecetaDetalle, RecetaDetalle.producto_id),
        (PickingItem, PickingItem.producto_id),
        (DevolucionItem, DevolucionItem.producto_id),
        (Producto, Producto.sustituto_id),
    ):
        total = await db.scalar(select(func.count()).select_from(modelo).where(columna == codigo))
        if total:
            return True
    return False


async def delete_producto(db: AsyncSession, prod: Producto) -> None:
    await db.delete(prod)
    await db.commit()


# --- Recetas -----------------------------------------------------------------

async def list_recetas_full(db: AsyncSession) -> list[Receta]:
    result = await db.execute(
        select(Receta)
        .options(selectinload(Receta.detalle).selectinload(RecetaDetalle.producto))
        .order_by(Receta.id)
    )
    return list(result.scalars().all())


async def get_receta_full(db: AsyncSession, receta_id: int) -> Receta | None:
    result = await db.execute(
        select(Receta)
        .where(Receta.id == receta_id)
        .options(selectinload(Receta.detalle).selectinload(RecetaDetalle.producto))
    )
    return result.scalar_one_or_none()


async def create_receta(db: AsyncSession, data: RecetaCreate) -> Receta:
    receta = Receta(
        nombre_sistema=data.nombre_sistema,
        descripcion=data.descripcion,
        detalle=[
            RecetaDetalle(producto_id=d.producto_id, cantidad_por_m2=d.cantidad_por_m2)
            for d in data.detalle
        ],
    )
    db.add(receta)
    await db.commit()
    return await get_receta_full(db, receta.id)


async def update_receta(db: AsyncSession, receta: Receta, data: RecetaUpdate) -> Receta:
    if data.descripcion is not None:
        receta.descripcion = data.descripcion
    if data.activa is not None:
        receta.activa = data.activa
    if data.detalle is not None:
        receta.detalle.clear()
        await db.flush()
        for d in data.detalle:
            receta.detalle.append(
                RecetaDetalle(producto_id=d.producto_id, cantidad_por_m2=d.cantidad_por_m2)
            )
    await db.commit()
    return await get_receta_full(db, receta.id)


# --- Importación maestro de productos (Avesoft P1) ---------------------------

async def importar_maestro(db: AsyncSession, parseado: MaestroParseado) -> ImportResult:
    """Upsert por codigo_avesoft. Resuelve proveedor por nombre (lo crea si falta).

    Dos pasadas: primero los productos, luego los enlaces de sustituto (que
    pueden apuntar a un código que aparece más abajo en el mismo archivo).
    """
    errores = list(parseado.errores)
    creados = 0
    actualizados = 0

    # Cache de proveedores por nombre (case-insensitive).
    proveedores = {p.nombre.lower(): p for p in await list_proveedores(db)}

    # Pasada 1: productos (sin sustituto todavía).
    for fila in parseado.filas:
        proveedor_id = None
        if fila.proveedor:
            prov = proveedores.get(fila.proveedor.lower())
            if prov is None:
                prov = Proveedor(nombre=fila.proveedor, peso_tara_kg=0)
                db.add(prov)
                await db.flush()
                proveedores[fila.proveedor.lower()] = prov
            proveedor_id = prov.id

        prod = await db.get(Producto, fila.codigo_avesoft)
        if prod is None:
            db.add(
                Producto(
                    codigo_avesoft=fila.codigo_avesoft,
                    descripcion=fila.descripcion,
                    unidad_medida=fila.unidad_medida,
                    proveedor_id=proveedor_id,
                    peso_tara_kg=fila.peso_tara_kg,
                    stock_actual=fila.stock_actual,
                    stock_minimo=fila.stock_minimo,
                )
            )
            creados += 1
        else:
            prod.descripcion = fila.descripcion
            prod.unidad_medida = fila.unidad_medida
            prod.proveedor_id = proveedor_id
            prod.peso_tara_kg = fila.peso_tara_kg
            prod.stock_actual = fila.stock_actual
            prod.stock_minimo = fila.stock_minimo
            actualizados += 1

    await db.flush()

    # Pasada 2: enlaces de sustituto, ya con todos los códigos disponibles.
    for fila in parseado.filas:
        if not fila.sustituto_id:
            continue
        objetivo = await db.get(Producto, fila.sustituto_id)
        if objetivo is None:
            errores.append(
                f"Línea {fila.linea}: el sustituto '{fila.sustituto_id}' no existe en el catálogo."
            )
            continue
        prod = await db.get(Producto, fila.codigo_avesoft)
        prod.sustituto_id = fila.sustituto_id

    await db.commit()
    return ImportResult(
        total_filas=len(parseado.filas),
        creados=creados,
        actualizados=actualizados,
        errores=errores,
    )
