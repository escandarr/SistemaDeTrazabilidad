"""Puntos de Integración 2 y 3 — archivos CSV batch hacia Avesoft.

Avesoft no expone API: el intercambio es por archivo plano que el área de
administración importa. Separador ';' (formato regional chileno de Excel),
decimales con punto, una fila por producto.
"""

CABECERA = [
    "codigo_producto",
    "descripcion",
    "cantidad",
    "unidad",
    "tipo_movimiento",
    "centro_costo",
    "obra",
    "referencia",
    "fecha",
]


def generar_csv(filas: list[dict]) -> str:
    lineas = [";".join(CABECERA)]
    for fila in filas:
        lineas.append(";".join(str(fila[col]) for col in CABECERA))
    return "\r\n".join(lineas) + "\r\n"
