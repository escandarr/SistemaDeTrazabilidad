import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


async def get_by_email(db: AsyncSession, email: str) -> Usuario | None:
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> Usuario | None:
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession) -> list[Usuario]:
    result = await db.execute(select(Usuario).order_by(Usuario.creado_at))
    return list(result.scalars().all())


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


async def update(db: AsyncSession, user: Usuario, data: UsuarioUpdate) -> Usuario:
    if data.nombre is not None:
        user.nombre = data.nombre
    if data.rol is not None:
        user.rol = data.rol
    if data.activo is not None:
        user.activo = data.activo
    if data.password:
        user.password_hash = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    return user
