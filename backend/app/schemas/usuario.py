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


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
