"""Dependencias de autenticación y autorización (RF01)."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Usuario:
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    user = result.scalar_one_or_none()
    if user is None or not user.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado o inactivo")
    return user


def require_roles(*roles: RolUsuario):
    """Restringe un endpoint a los roles indicados (denegación por defecto)."""

    async def checker(user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
        if user.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Rol sin permisos para esta operación")
        return user

    return checker
