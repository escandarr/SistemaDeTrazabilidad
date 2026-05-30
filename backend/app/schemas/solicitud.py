import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoSolicitud


class SolicitudCreate(BaseModel):
    centro_costo_id: str
    m2: float
    sistema_id: int
    factor_holgura: float = 0
    presupuesto_aprobado: bool = False


class SolicitudRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supervisor_id: uuid.UUID
    centro_costo_id: str
    m2: float
    sistema_id: int
    estado: EstadoSolicitud
    presupuesto_aprobado: bool
    factor_holgura: float
    creado_at: datetime


class MaterialCalculadoOut(BaseModel):
    producto_id: str
    cantidad_neta_kg: float
