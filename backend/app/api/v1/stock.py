"""RF06 — Monitor de stock y disponibilidad."""
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogo import Producto
from app.models.usuario import Usuario
from app.schemas.producto import ProductoRead

router = APIRouter(prefix="/stock", tags=["stock"])


def _estado(actual: float, minimo: float) -> str:
    if actual < minimo:
        return "CRITICO"
    if actual <= minimo * 1.2:
        return "BAJO"
    return "OK"


@router.get("", response_model=list[ProductoRead])
async def listar_stock(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    result = await db.execute(select(Producto))
    return result.scalars().all()


@router.get("/exportar")
async def exportar_stock(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    """Exporta el inventario actual a CSV (para revisión o reposición)."""
    result = await db.execute(select(Producto).order_by(Producto.descripcion))
    cols = ["codigo_avesoft", "descripcion", "unidad", "stock_actual", "stock_minimo", "estado"]
    lineas = [";".join(cols)]
    for p in result.scalars().all():
        actual = float(p.stock_actual)
        minimo = float(p.stock_minimo)
        lineas.append(
            ";".join(
                [
                    p.codigo_avesoft,
                    p.descripcion,
                    p.unidad_medida.value,
                    f"{actual:.3f}",
                    f"{minimo:.3f}",
                    _estado(actual, minimo),
                ]
            )
        )
    contenido = "\r\n".join(lineas) + "\r\n"
    return Response(
        content=contenido,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="inventario.csv"'},
    )
