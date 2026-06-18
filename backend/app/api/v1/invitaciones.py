"""RF01 — Aceptación de invitaciones (endpoints públicos, sin sesión).

El usuario invitado abre el enlace con su token y define su contraseña.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, validar_password
from app.crud import invitacion as crud_invitacion
from app.schemas.usuario import AceptarInvitacionRequest, InvitacionInfo

router = APIRouter(prefix="/invitaciones", tags=["invitaciones"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/{token}", response_model=InvitacionInfo)
async def info_invitacion(token: str, db: DbDep):
    inv = await crud_invitacion.get_by_token(db, token)
    if inv is None:
        return InvitacionInfo(valido=False, motivo="La invitación no existe.")
    if not crud_invitacion.esta_vigente(inv):
        return InvitacionInfo(valido=False, motivo="La invitación expiró o ya fue utilizada.")
    return InvitacionInfo(valido=True, nombre=inv.usuario.nombre, email=inv.usuario.email)


@router.post("/{token}/aceptar", status_code=status.HTTP_204_NO_CONTENT)
async def aceptar_invitacion(token: str, data: AceptarInvitacionRequest, db: DbDep):
    inv = await crud_invitacion.get_by_token(db, token)
    if inv is None or not crud_invitacion.esta_vigente(inv):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invitación inválida o expirada.")
    faltantes = validar_password(data.password)
    if faltantes:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "La contraseña no cumple los requisitos: " + "; ".join(faltantes),
        )
    inv.usuario.password_hash = hash_password(data.password)
    inv.usuario.activo = True
    inv.usado = True
    await db.commit()
