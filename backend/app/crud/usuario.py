from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate


async def get_by_email(db: AsyncSession, email: str) -> Usuario | None:
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: UsuarioCreate) -> Usuario:
    user = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
