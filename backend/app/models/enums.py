import enum


class RolUsuario(str, enum.Enum):
    """Matriz de roles del sistema (RF01)."""

    ADMINISTRADOR = "administrador"
    SUPERVISOR = "supervisor"
    OPERARIO_BODEGA = "operario_bodega"
    JEFE_BODEGA = "jefe_bodega"


class EstadoSolicitud(str, enum.Enum):
    """Máquina de estados lineal de una solicitud (3.1.1)."""

    BORRADOR = "borrador"
    ENVIADA = "enviada"
    EN_PICKING = "en_picking"
    DESPACHADA = "despachada"
    CERRADA = "cerrada"


class EstadoPicking(str, enum.Enum):
    PENDIENTE = "pendiente"
    CONFIRMADO = "confirmado"
    RECHAZADO = "rechazado"


class UnidadMedida(str, enum.Enum):
    KILO = "kg"
    LITRO = "l"
    UNIDAD = "un"


class SistemaPiso(str, enum.Enum):
    """Sistemas constructivos de pavimento (recetas)."""

    MMA = "mma"
    URETANO = "uretano"
    EPOXI = "epoxi"
