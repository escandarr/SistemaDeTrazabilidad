"""Panel de administración de materiales (3.7) + Avesoft P1 (import/export catálogo).

CRUD de productos, proveedores y recetas, e importación/exportación del maestro
de productos por CSV. Todo restringido a rol administrador.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.crud import catalogo as crud
from app.models.catalogo import Receta
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.catalogo import (
    ImportResult,
    ProductoCreate,
    ProductoRead,
    ProductoUpdate,
    ProveedorCreate,
    ProveedorRead,
    ProveedorUpdate,
    RecetaCreate,
    RecetaDetalleOut,
    RecetaFullRead,
    RecetaUpdate,
)
from app.services.avesoft import generar_maestro_csv, parsear_maestro

router = APIRouter(prefix="/catalogo", tags=["catalogo"])

AdminDep = Annotated[Usuario, Depends(require_roles(RolUsuario.ADMINISTRADOR))]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _receta_out(receta: Receta) -> RecetaFullRead:
    return RecetaFullRead(
        id=receta.id,
        nombre_sistema=receta.nombre_sistema,
        descripcion=receta.descripcion,
        activa=receta.activa,
        detalle=[
            RecetaDetalleOut(
                id=d.id,
                producto_id=d.producto_id,
                cantidad_por_m2=float(d.cantidad_por_m2),
                descripcion=d.producto.descripcion if d.producto else None,
            )
            for d in receta.detalle
        ],
    )


# --- Proveedores -------------------------------------------------------------

@router.get("/proveedores", response_model=list[ProveedorRead])
async def listar_proveedores(db: DbDep, _admin: AdminDep):
    return await crud.list_proveedores(db)


@router.post("/proveedores", response_model=ProveedorRead, status_code=status.HTTP_201_CREATED)
async def crear_proveedor(data: ProveedorCreate, db: DbDep, _admin: AdminDep):
    if await crud.get_proveedor_by_nombre(db, data.nombre):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proveedor con ese nombre")
    return await crud.create_proveedor(db, data)


@router.patch("/proveedores/{proveedor_id}", response_model=ProveedorRead)
async def actualizar_proveedor(proveedor_id: int, data: ProveedorUpdate, db: DbDep, _admin: AdminDep):
    prov = await crud.get_proveedor(db, proveedor_id)
    if prov is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")
    return await crud.update_proveedor(db, prov, data)


@router.delete("/proveedores/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_proveedor(proveedor_id: int, db: DbDep, _admin: AdminDep):
    prov = await crud.get_proveedor(db, proveedor_id)
    if prov is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")
    if await crud.proveedor_en_uso(db, proveedor_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "No se puede eliminar: tiene productos asociados")
    await crud.delete_proveedor(db, prov)


# --- Productos ---------------------------------------------------------------

@router.get("/productos", response_model=list[ProductoRead])
async def listar_productos(db: DbDep, _admin: AdminDep):
    return await crud.list_productos(db)


@router.post("/productos", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
async def crear_producto(data: ProductoCreate, db: DbDep, _admin: AdminDep):
    if await crud.get_producto(db, data.codigo_avesoft):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un producto con ese código Avesoft")
    return await crud.create_producto(db, data)


@router.patch("/productos/{codigo}", response_model=ProductoRead)
async def actualizar_producto(codigo: str, data: ProductoUpdate, db: DbDep, _admin: AdminDep):
    prod = await crud.get_producto(db, codigo)
    if prod is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return await crud.update_producto(db, prod, data)


@router.delete("/productos/{codigo}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_producto(codigo: str, db: DbDep, _admin: AdminDep):
    prod = await crud.get_producto(db, codigo)
    if prod is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    if await crud.producto_en_uso(db, codigo):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No se puede eliminar: el producto está en recetas, pickings o devoluciones",
        )
    await crud.delete_producto(db, prod)


@router.post("/productos/importar", response_model=ImportResult)
async def importar_productos(db: DbDep, _admin: AdminDep, archivo: UploadFile = File(...)):
    """Punto de Integración 1: importa el maestro de productos desde un CSV de Avesoft."""
    contenido = (await archivo.read()).decode("utf-8-sig", errors="replace")
    parseado = parsear_maestro(contenido)
    if not parseado.filas and parseado.errores:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "; ".join(parseado.errores[:5]))
    return await crud.importar_maestro(db, parseado)


@router.get("/productos/exportar")
async def exportar_productos(db: DbDep, _admin: AdminDep):
    """Exporta el catálogo completo en el formato del maestro (P1)."""
    proveedores = {p.id: p.nombre for p in await crud.list_proveedores(db)}
    productos = await crud.list_productos(db)
    filas = [
        {
            "codigo_avesoft": p.codigo_avesoft,
            "descripcion": p.descripcion,
            "unidad_medida": p.unidad_medida.value,
            "proveedor": proveedores.get(p.proveedor_id, ""),
            "peso_tara_kg": "" if p.peso_tara_kg is None else f"{float(p.peso_tara_kg):.3f}",
            "stock_actual": f"{float(p.stock_actual):.3f}",
            "stock_minimo": f"{float(p.stock_minimo):.3f}",
            "sustituto_id": p.sustituto_id or "",
        }
        for p in productos
    ]
    return Response(
        content=generar_maestro_csv(filas),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="maestro_productos.csv"'},
    )


# --- Recetas -----------------------------------------------------------------

@router.get("/recetas", response_model=list[RecetaFullRead])
async def listar_recetas(db: DbDep, _admin: AdminDep):
    return [_receta_out(r) for r in await crud.list_recetas_full(db)]


@router.post("/recetas", response_model=RecetaFullRead, status_code=status.HTTP_201_CREATED)
async def crear_receta(data: RecetaCreate, db: DbDep, _admin: AdminDep):
    return _receta_out(await crud.create_receta(db, data))


@router.patch("/recetas/{receta_id}", response_model=RecetaFullRead)
async def actualizar_receta(receta_id: int, data: RecetaUpdate, db: DbDep, _admin: AdminDep):
    receta = await crud.get_receta_full(db, receta_id)
    if receta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receta no encontrada")
    return _receta_out(await crud.update_receta(db, receta, data))
