import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import RolUsuario


class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: RolUsuario


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioRead(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activo: bool


class UsuarioUpdate(BaseModel):
    """Edición por el administrador (rol, estado, datos). Todo opcional."""

    nombre: str | None = None
    rol: RolUsuario | None = None
    activo: bool | None = None
    password: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Invitaciones (alta por enlace, el usuario define su contraseña) ---

class InvitarRequest(UsuarioBase):
    """El admin solo entrega nombre, email y rol; no fija contraseña."""


class InvitacionCreada(BaseModel):
    """El backend devuelve el token; el frontend arma el enlace con su origin."""

    email: EmailStr
    nombre: str
    token: str
    enviado_por_correo: bool = False


class BulkInvitacionResult(BaseModel):
    total_filas: int
    invitados: list[InvitacionCreada]
    errores: list[str]


class InvitacionInfo(BaseModel):
    """Datos públicos de una invitación, para la página de aceptación."""

    valido: bool
    nombre: str | None = None
    email: EmailStr | None = None
    motivo: str | None = None


class AceptarInvitacionRequest(BaseModel):
    password: str
