"""RF01 — Gestión de usuarios, roles y estado (solo administrador).

Alta por invitación: el admin entrega nombre/email/rol y el sistema genera un
enlace con token; el usuario queda inactivo hasta que define su contraseña.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.security import generar_token_url, hash_password
from app.crud import invitacion as crud_invitacion
from app.crud import usuario as crud_usuario
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import (
    BulkInvitacionResult,
    InvitacionCreada,
    InvitarRequest,
    UsuarioCreate,
    UsuarioRead,
    UsuarioUpdate,
)
from app.services.notificaciones import enviar_invitacion
from app.services.usuarios_import import parsear_usuarios, plantilla_csv

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# Todas las operaciones requieren rol administrador.
AdminDep = Annotated[Usuario, Depends(require_roles(RolUsuario.ADMINISTRADOR))]
DbDep = Annotated[AsyncSession, Depends(get_db)]


async def _crear_invitacion(db: AsyncSession, nombre: str, email: str, rol: RolUsuario):
    """Crea (o re-invita) un usuario inactivo y le genera una invitación.

    Lanza ValueError si el email ya pertenece a un usuario activo.
    """
    existing = await crud_usuario.get_by_email(db, email)
    if existing and existing.activo:
        raise ValueError(f"{email}: ya pertenece a un usuario activo")
    if existing:
        # Usuario pendiente: actualizamos datos y reemitimos la invitación.
        existing.nombre = nombre
        existing.rol = rol
        await crud_invitacion.invalidar_pendientes(db, existing.id)
        user = existing
    else:
        user = Usuario(
            nombre=nombre,
            email=email,
            # Clave aleatoria inutilizable hasta que el usuario fije la suya.
            password_hash=hash_password(generar_token_url()),
            rol=rol,
            activo=False,
        )
        db.add(user)
        await db.flush()
    inv = await crud_invitacion.crear(db, user.id)
    return user, inv


@router.get("", response_model=list[UsuarioRead])
async def listar_usuarios(db: DbDep, _admin: AdminDep):
    return await crud_usuario.list_all(db)


@router.post("/invitar", response_model=InvitacionCreada, status_code=status.HTTP_201_CREATED)
async def invitar_usuario(data: InvitarRequest, db: DbDep, _admin: AdminDep):
    try:
        user, inv = await _crear_invitacion(db, data.nombre, str(data.email), data.rol)
    except ValueError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    await db.commit()
    enviado = await enviar_invitacion(user.email, user.nombre, inv.token)
    return InvitacionCreada(email=user.email, nombre=user.nombre, token=inv.token, enviado_por_correo=enviado)


@router.post("/invitar/bulk", response_model=BulkInvitacionResult)
async def invitar_bulk(db: DbDep, _admin: AdminDep, archivo: UploadFile = File(...)):
    contenido = (await archivo.read()).decode("utf-8-sig", errors="replace")
    parsed = parsear_usuarios(contenido)
    if not parsed.filas and parsed.errores:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "; ".join(parsed.errores[:5]))

    invitados: list[InvitacionCreada] = []
    errores = list(parsed.errores)
    vistos: set[str] = set()
    for fila in parsed.filas:
        if fila.email in vistos:
            errores.append(f"Línea {fila.linea}: email {fila.email} duplicado en el archivo.")
            continue
        vistos.add(fila.email)
        try:
            user, inv = await _crear_invitacion(db, fila.nombre, fila.email, RolUsuario(fila.rol))
            invitados.append(InvitacionCreada(email=user.email, nombre=user.nombre, token=inv.token))
        except ValueError as e:
            errores.append(f"Línea {fila.linea}: {e}")

    await db.commit()
    for inv_creada in invitados:
        await enviar_invitacion(inv_creada.email, inv_creada.nombre, inv_creada.token)
    return BulkInvitacionResult(total_filas=len(parsed.filas), invitados=invitados, errores=errores)


@router.get("/plantilla")
async def descargar_plantilla(_admin: AdminDep):
    return Response(
        content=plantilla_csv(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="plantilla_usuarios.csv"'},
    )


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
async def crear_usuario(data: UsuarioCreate, db: DbDep, _admin: AdminDep):
    """Alta directa con contraseña (uso interno/compatibilidad). El flujo
    recomendado es POST /usuarios/invitar."""
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
