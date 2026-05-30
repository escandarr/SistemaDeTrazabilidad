"""Flujo transaccional — Módulo de Operaciones (3.1).

Solicitud -> Picking -> Despacho (P2 Avesoft) -> Devolución (P3 Avesoft).
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoPicking, EstadoSolicitud


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id: Mapped[int] = mapped_column(primary_key=True)
    supervisor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"))
    centro_costo_id: Mapped[str] = mapped_column(ForeignKey("centros_costo.codigo"))
    m2: Mapped[float] = mapped_column(Numeric(12, 2))
    sistema_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"))
    estado: Mapped[EstadoSolicitud] = mapped_column(
        SAEnum(EstadoSolicitud, name="estado_solicitud"), default=EstadoSolicitud.BORRADOR
    )
    presupuesto_aprobado: Mapped[bool] = mapped_column(Boolean, default=False)
    # Factor de holgura técnica: % extra para obras fuera de la RM (RF02, paso 3).
    factor_holgura: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    creado_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supervisor = relationship("Usuario")
    centro_costo = relationship("CentroCosto")
    receta = relationship("Receta")
    picking = relationship("Picking", back_populates="solicitud", uselist=False)


class Picking(Base):
    __tablename__ = "pickings"

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(ForeignKey("solicitudes.id"))
    confirmado_por: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[EstadoPicking] = mapped_column(
        SAEnum(EstadoPicking, name="estado_picking"), default=EstadoPicking.PENDIENTE
    )
    creado_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("Solicitud", back_populates="picking")
    items: Mapped[list["PickingItem"]] = relationship(
        back_populates="picking", cascade="all, delete-orphan"
    )
    despacho = relationship("Despacho", back_populates="picking", uselist=False)


class PickingItem(Base):
    __tablename__ = "picking_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    picking_id: Mapped[int] = mapped_column(ForeignKey("pickings.id"))
    producto_id: Mapped[str] = mapped_column(ForeignKey("productos.codigo_avesoft"))
    # Requerimiento neto teórico (motor de cubicación, 3.1.2).
    cantidad_teorica: Mapped[float | None] = mapped_column(Numeric(12, 3))
    # Pesaje real en báscula y balance de masa: M_neto = M_bruto - M_tara (ec. 1).
    peso_bruto: Mapped[float | None] = mapped_column(Numeric(12, 3))
    peso_tara: Mapped[float | None] = mapped_column(Numeric(12, 3))
    peso_neto: Mapped[float | None] = mapped_column(Numeric(12, 3))

    picking = relationship("Picking", back_populates="items")
    producto = relationship("Producto")


class Despacho(Base):
    __tablename__ = "despachos"

    id: Mapped[int] = mapped_column(primary_key=True)
    picking_id: Mapped[int] = mapped_column(ForeignKey("pickings.id"))
    # Punto de Integración 2: archivo CSV de consumos hacia Avesoft.
    ruta_archivo_csv: Mapped[str | None] = mapped_column(String(255))
    guia_avesoft_ref: Mapped[str | None] = mapped_column(String(120))
    fecha_procesado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    picking = relationship("Picking", back_populates="despacho")
    devoluciones: Mapped[list["Devolucion"]] = relationship(back_populates="despacho")


class Devolucion(Base):
    __tablename__ = "devoluciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    despacho_id: Mapped[int] = mapped_column(ForeignKey("despachos.id"))
    # Punto de Integración 3: archivo CSV de reingreso neto hacia Avesoft.
    ruta_archivo_csv: Mapped[str | None] = mapped_column(String(255))
    guia_ingreso_ref: Mapped[str | None] = mapped_column(String(120))
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    despacho = relationship("Despacho", back_populates="devoluciones")
    items: Mapped[list["DevolucionItem"]] = relationship(
        back_populates="devolucion", cascade="all, delete-orphan"
    )


class DevolucionItem(Base):
    """Extensión a Tabla 2: pesaje por producto del material retornado (RF05).

    Permite aplicar la misma deducción de tara del picking al flujo de retorno.
    """

    __tablename__ = "devolucion_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    devolucion_id: Mapped[int] = mapped_column(ForeignKey("devoluciones.id"))
    producto_id: Mapped[str] = mapped_column(ForeignKey("productos.codigo_avesoft"))
    peso_bruto: Mapped[float | None] = mapped_column(Numeric(12, 3))
    peso_tara: Mapped[float | None] = mapped_column(Numeric(12, 3))
    peso_neto: Mapped[float | None] = mapped_column(Numeric(12, 3))

    devolucion = relationship("Devolucion", back_populates="items")
    producto = relationship("Producto")
