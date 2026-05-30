"""Datos maestros — Módulo de Administración (3.2).

Catálogo de productos, proveedores, recetas y centros de costo.
"""
from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import SistemaPiso, UnidadMedida


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)
    # Coeficiente de tara configurable por proveedor (RF03 / RF08).
    # Ej.: Renner = 1.0 kg; otros = 2.5 kg.
    peso_tara_kg: Mapped[float] = mapped_column(Numeric(10, 3), default=0)

    productos: Mapped[list["Producto"]] = relationship(back_populates="proveedor")


class Producto(Base):
    __tablename__ = "productos"

    codigo_avesoft: Mapped[str] = mapped_column(String(60), primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(255))
    unidad_medida: Mapped[UnidadMedida] = mapped_column(SAEnum(UnidadMedida, name="unidad_medida"))
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"))
    # Override opcional de la tara a nivel producto (Tabla 2). Si es NULL se usa
    # proveedor.peso_tara_kg. Resolución en app/services/pesaje.py.
    peso_tara_kg: Mapped[float | None] = mapped_column(Numeric(10, 3))
    stock_actual: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    stock_minimo: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    # Auto-referencia: SKU alternativo técnicamente compatible (RF07 — sustitución).
    sustituto_id: Mapped[str | None] = mapped_column(ForeignKey("productos.codigo_avesoft"))

    proveedor: Mapped["Proveedor | None"] = relationship(back_populates="productos")
    sustituto: Mapped["Producto | None"] = relationship(remote_side=[codigo_avesoft])


class Receta(Base):
    __tablename__ = "recetas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_sistema: Mapped[SistemaPiso] = mapped_column(SAEnum(SistemaPiso, name="sistema_piso"))
    descripcion: Mapped[str | None] = mapped_column(String(255))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    detalle: Mapped[list["RecetaDetalle"]] = relationship(
        back_populates="receta", cascade="all, delete-orphan"
    )


class RecetaDetalle(Base):
    __tablename__ = "receta_detalle"

    id: Mapped[int] = mapped_column(primary_key=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"))
    producto_id: Mapped[str] = mapped_column(ForeignKey("productos.codigo_avesoft"))
    # Tasa de consumo por m² para esta solución constructiva (motor de cubicación).
    cantidad_por_m2: Mapped[float] = mapped_column(Numeric(12, 4))

    receta: Mapped["Receta"] = relationship(back_populates="detalle")
    producto: Mapped["Producto"] = relationship()


class CentroCosto(Base):
    __tablename__ = "centros_costo"

    codigo: Mapped[str] = mapped_column(String(60), primary_key=True)
    nombre_obra: Mapped[str] = mapped_column(String(180))
    cliente_identificador: Mapped[str | None] = mapped_column(String(120))
    estado_activo: Mapped[bool] = mapped_column(Boolean, default=True)
