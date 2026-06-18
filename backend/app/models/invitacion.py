"""Invitación de usuario (RF01) — flujo de alta sin contraseña inicial.

El admin invita; el usuario queda inactivo hasta que abre el enlace con su token
y define su propia contraseña. Tabla nueva: no altera ``usuarios`` existente.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invitacion(Base):
    __tablename__ = "invitaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"))
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expira: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado: Mapped[bool] = mapped_column(Boolean, default=False)
    creado_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")
