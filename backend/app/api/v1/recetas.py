"""Catálogo de recetas / sistemas de piso (RF03 — cálculo de materiales)."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogo import Receta
from app.models.usuario import Usuario
from app.schemas.receta import RecetaRead

router = APIRouter(prefix="/recetas", tags=["recetas"])


@router.get("", response_model=list[RecetaRead])
async def listar_recetas(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(get_current_user)],
):
    result = await db.execute(
        select(Receta).where(Receta.activa.is_(True)).order_by(Receta.id)
    )
    return result.scalars().all()
