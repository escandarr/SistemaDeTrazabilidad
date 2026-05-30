from pydantic import BaseModel, ConfigDict

from app.models.enums import UnidadMedida


class ProductoBase(BaseModel):
    codigo_avesoft: str
    descripcion: str
    unidad_medida: UnidadMedida
    proveedor_id: int | None = None
    peso_tara_kg: float | None = None
    stock_actual: float = 0
    stock_minimo: float = 0
    sustituto_id: str | None = None


class ProductoCreate(ProductoBase):
    pass


class ProductoRead(ProductoBase):
    model_config = ConfigDict(from_attributes=True)
