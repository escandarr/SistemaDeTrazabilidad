"""RF06 — Monitor de stock y disponibilidad."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogo import Producto
from app.models.usuario import Usuario
from app.schemas.producto import ProductoRead

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=list[ProductoRead])
async def listar_stock(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    result = await db.execute(select(Producto))
    return result.scalars().all()
