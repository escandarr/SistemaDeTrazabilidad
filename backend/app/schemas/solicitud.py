from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoSolicitud


class SolicitudCreate(BaseModel):
    # Nombre de la obra: si no existe el centro de costo, se crea al vuelo.
    obra: str
    m2: float
    sistema_id: int
    factor_holgura: float = 0
    presupuesto_aprobado: bool = False


class CubicarRequest(BaseModel):
    """Preview de cubicación sin persistir (usado por el wizard de nueva solicitud)."""

    sistema_id: int
    m2: float
    factor_holgura: float = 0


class MaterialCalculadoOut(BaseModel):
    producto_id: str
    cantidad_neta_kg: float


class SolicitudListItem(BaseModel):
    """Vista enriquecida para listados: nombres de obra y sistema legibles."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    obra: str
    sistema: str
    m2: float
    estado: EstadoSolicitud
    creado_at: datetime
