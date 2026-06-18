"""Schemas del catálogo maestro — Panel de administración de materiales (3.7).

Productos, proveedores y recetas (sistemas de piso), más el resultado de la
importación batch del maestro de productos (Punto de Integración 1 con Avesoft).
"""
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SistemaPiso, UnidadMedida


# --- Proveedores -------------------------------------------------------------

class ProveedorBase(BaseModel):
    nombre: str
    # Tara por envase del proveedor (RF03): Renner 1 kg, otros 2.5 kg.
    peso_tara_kg: float = 0


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: str | None = None
    peso_tara_kg: float | None = None


class ProveedorRead(ProveedorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# --- Productos ---------------------------------------------------------------

class ProductoCreate(BaseModel):
    codigo_avesoft: str
    descripcion: str
    unidad_medida: UnidadMedida = UnidadMedida.KILO
    proveedor_id: int | None = None
    peso_tara_kg: float | None = None
    stock_actual: float = 0
    stock_minimo: float = 0
    sustituto_id: str | None = None


class ProductoUpdate(BaseModel):
    descripcion: str | None = None
    unidad_medida: UnidadMedida | None = None
    proveedor_id: int | None = None
    peso_tara_kg: float | None = None
    stock_actual: float | None = None
    stock_minimo: float | None = None
    sustituto_id: str | None = None


class ProductoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo_avesoft: str
    descripcion: str
    unidad_medida: UnidadMedida
    proveedor_id: int | None
    peso_tara_kg: float | None
    stock_actual: float
    stock_minimo: float
    sustituto_id: str | None


# --- Recetas (sistemas de piso) ---------------------------------------------

class RecetaDetalleIn(BaseModel):
    producto_id: str
    cantidad_por_m2: float = Field(gt=0)


class RecetaDetalleOut(RecetaDetalleIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    descripcion: str | None = None


class RecetaCreate(BaseModel):
    nombre_sistema: SistemaPiso
    descripcion: str | None = None
    detalle: list[RecetaDetalleIn] = Field(default_factory=list)


class RecetaUpdate(BaseModel):
    descripcion: str | None = None
    activa: bool | None = None
    # Si se entrega, reemplaza el detalle completo.
    detalle: list[RecetaDetalleIn] | None = None


class RecetaFullRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_sistema: SistemaPiso
    descripcion: str | None
    activa: bool
    detalle: list[RecetaDetalleOut]


# --- Importación (Avesoft P1) ------------------------------------------------

class ImportResult(BaseModel):
    total_filas: int
    creados: int
    actualizados: int
    errores: list[str] = Field(default_factory=list)
