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
