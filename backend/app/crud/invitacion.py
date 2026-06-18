"""CRUD de invitaciones de usuario (RF01)."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import generar_token_url
from app.models.invitacion import Invitacion

VIGENCIA_DIAS = 7


async def crear(db: AsyncSession, usuario_id: uuid.UUID) -> Invitacion:
    inv = Invitacion(
        usuario_id=usuario_id,
        token=generar_token_url(),
        expira=datetime.now(timezone.utc) + timedelta(days=VIGENCIA_DIAS),
    )
    db.add(inv)
    await db.flush()
    return inv


async def get_by_token(db: AsyncSession, token: str) -> Invitacion | None:
    result = await db.execute(
        select(Invitacion).where(Invitacion.token == token).options(selectinload(Invitacion.usuario))
    )
    return result.scalar_one_or_none()


async def invalidar_pendientes(db: AsyncSession, usuario_id: uuid.UUID) -> None:
    """Marca como usadas las invitaciones previas sin consumir (al reenviar)."""
    result = await db.execute(
        select(Invitacion).where(
            Invitacion.usuario_id == usuario_id, Invitacion.usado.is_(False)
        )
    )
    for inv in result.scalars().all():
        inv.usado = True


def esta_vigente(inv: Invitacion) -> bool:
    expira = inv.expira
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)
    return not inv.usado and expira > datetime.now(timezone.utc)
