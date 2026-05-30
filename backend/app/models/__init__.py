"""Registro central de modelos ORM.

Importar este paquete garantiza que todas las entidades queden registradas en
``Base.metadata`` (necesario para que Alembic detecte el esquema completo).
"""
from app.models.catalogo import (
    CentroCosto,
    Producto,
    Proveedor,
    Receta,
    RecetaDetalle,
)
from app.models.enums import (
    EstadoPicking,
    EstadoSolicitud,
    RolUsuario,
    SistemaPiso,
    UnidadMedida,
)
from app.models.operaciones import (
    Despacho,
    Devolucion,
    DevolucionItem,
    Picking,
    PickingItem,
    Solicitud,
)
from app.models.usuario import Usuario

__all__ = [
    "Usuario",
    "Proveedor",
    "Producto",
    "Receta",
    "RecetaDetalle",
    "CentroCosto",
    "Solicitud",
    "Picking",
    "PickingItem",
    "Despacho",
    "Devolucion",
    "DevolucionItem",
    "RolUsuario",
    "EstadoSolicitud",
    "EstadoPicking",
    "UnidadMedida",
    "SistemaPiso",
]
