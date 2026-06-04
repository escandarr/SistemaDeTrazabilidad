"""RF01 — Gestión de usuarios, roles y estado (solo administrador)."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.crud import usuario as crud_usuario
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioRead, UsuarioUpdate

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# Todas las operaciones requieren rol administrador.
AdminDep = Annotated[Usuario, Depends(require_roles(RolUsuario.ADMINISTRADOR))]
DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[UsuarioRead])
async def listar_usuarios(db: DbDep, _admin: AdminDep):
    return await crud_usuario.list_all(db)


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
async def crear_usuario(data: UsuarioCreate, db: DbDep, _admin: AdminDep):
    if await crud_usuario.get_by_email(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "El email ya está registrado")
    return await crud_usuario.create(db, data)


@router.patch("/{user_id}", response_model=UsuarioRead)
async def actualizar_usuario(
    user_id: uuid.UUID,
    data: UsuarioUpdate,
    db: DbDep,
    admin: AdminDep,
):
    user = await crud_usuario.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    # Un admin no puede desactivarse ni quitarse el rol a sí mismo (evita quedar sin acceso).
    if user.id == admin.id and (data.activo is False or (data.rol and data.rol != RolUsuario.ADMINISTRADOR)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes desactivar ni cambiar tu propio rol de administrador")
    return await crud_usuario.update(db, user, data)
