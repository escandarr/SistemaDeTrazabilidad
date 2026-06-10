"""Schemas del flujo operacional: Picking (RF03), Despacho (RF04), Devolución (RF05)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoPicking, EstadoSolicitud


# --- Picking -----------------------------------------------------------------

class PickingRow(BaseModel):
    """Fila del listado de picking: solicitudes enviadas o ya en proceso."""

    solicitud_id: int
    picking_id: int | None
    obra: str
    sistema: str
    m2: float
    estado_solicitud: EstadoSolicitud
    estado_picking: EstadoPicking | None


class PickingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: str
    descripcion: str
    unidad: str
    cantidad_teorica: float | None
    tara_unitaria: float
    peso_bruto: float | None
    peso_tara: float | None
    peso_neto: float | None


class PickingDetail(BaseModel):
    id: int
    solicitud_id: int
    obra: str
    sistema: str
    estado: EstadoPicking
    items: list[PickingItemOut]


class IniciarPickingRequest(BaseModel):
    solicitud_id: int


class PesajeRequest(BaseModel):
    """Pesadas por bulto en báscula (la hoja de pesaje: 20 + 20 = 40)."""

    pesos_bultos: list[float] = Field(min_length=1)


# --- Despacho ----------------------------------------------------------------

class DespachoItemOut(BaseModel):
    producto_id: str
    descripcion: str
    unidad: str
    peso_neto: float


class DespachoPendiente(BaseModel):
    """Picking confirmado a la espera de salida formal."""

    picking_id: int
    solicitud_id: int
    obra: str
    sistema: str
    total_neto_kg: float
    items: list[DespachoItemOut]


class CrearDespachoRequest(BaseModel):
    picking_id: int
    guia_ref: str | None = None


class DespachoRow(BaseModel):
    id: int
    solicitud_id: int
    obra: str
    sistema: str
    fecha: datetime | None
    total_neto_kg: float
    guia_avesoft_ref: str | None
    estado_solicitud: EstadoSolicitud
    tiene_devolucion: bool


# --- Devolución --------------------------------------------------------------

class DevolucionAbiertaItem(BaseModel):
    producto_id: str
    descripcion: str
    unidad: str
    despachado_kg: float
    tara_unitaria: float


class DevolucionAbierta(BaseModel):
    """Despacho cuya solicitud sigue abierta: puede recibir material de vuelta."""

    despacho_id: int
    solicitud_id: int
    obra: str
    fecha_despacho: datetime | None
    items: list[DevolucionAbiertaItem]


class DevolucionItemRequest(BaseModel):
    producto_id: str
    pesos_bultos: list[float] = Field(min_length=1)


class CrearDevolucionRequest(BaseModel):
    despacho_id: int
    guia_ref: str | None = None
    items: list[DevolucionItemRequest] = Field(min_length=1)


class DevolucionRow(BaseModel):
    id: int
    despacho_id: int
    solicitud_id: int
    obra: str
    fecha: datetime
    total_devuelto_kg: float
    consumo_real_kg: float
