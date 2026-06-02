from pydantic import BaseModel, ConfigDict

from app.models.enums import SistemaPiso


class RecetaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_sistema: SistemaPiso
    descripcion: str | None
