"""Integración con Avesoft — Avesoft no expone API, el intercambio es por CSV.

- Punto 1 (P1): importación del maestro de productos (catálogo) DESDE Avesoft.
- Punto 2 (P2): CSV de consumos/salidas HACIA Avesoft (despacho).
- Punto 3 (P3): CSV de reingreso neto HACIA Avesoft (devolución).

Separador ';' (formato regional chileno de Excel), una fila por producto.
"""
import csv
import io
from dataclasses import dataclass, field

# --- Movimientos (P2 / P3): salida y entrada por centro de costo ----------

CABECERA_MOVIMIENTO = [
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
    """CSV de movimientos para Avesoft (P2 salidas, P3 reingresos)."""
    lineas = [";".join(CABECERA_MOVIMIENTO)]
    for fila in filas:
        lineas.append(";".join(str(fila[col]) for col in CABECERA_MOVIMIENTO))
    return "\r\n".join(lineas) + "\r\n"


# --- Maestro de productos (P1): catálogo --------------------------------------

CABECERA_MAESTRO = [
    "codigo_avesoft",
    "descripcion",
    "unidad_medida",
    "proveedor",
    "peso_tara_kg",
    "stock_actual",
    "stock_minimo",
    "sustituto_id",
]

_UNIDADES_VALIDAS = {"kg", "l", "un"}


@dataclass
class FilaMaestro:
    linea: int
    codigo_avesoft: str
    descripcion: str
    unidad_medida: str
    proveedor: str | None
    peso_tara_kg: float | None
    stock_actual: float
    stock_minimo: float
    sustituto_id: str | None


@dataclass
class MaestroParseado:
    filas: list[FilaMaestro] = field(default_factory=list)
    errores: list[str] = field(default_factory=list)


def _numero(valor: str) -> float | None:
    """Parsea un número tolerando coma decimal (2,5) y vacío."""
    valor = (valor or "").strip().replace(",", ".")
    if valor == "":
        return None
    return float(valor)


def parsear_maestro(contenido: str) -> MaestroParseado:
    """Lee el CSV del maestro de productos. Detecta separador ';' o ','.

    Tolerante: ignora filas vacías, acumula errores por línea sin abortar.
    """
    contenido = contenido.lstrip("﻿")
    if not contenido.strip():
        return MaestroParseado(errores=["El archivo está vacío."])

    primera = contenido.splitlines()[0]
    delim = ";" if primera.count(";") >= primera.count(",") else ","

    lector = csv.reader(io.StringIO(contenido), delimiter=delim)
    filas_raw = [f for f in lector]
    if not filas_raw:
        return MaestroParseado(errores=["El archivo está vacío."])

    cabecera = [c.strip().lower() for c in filas_raw[0]]
    idx = {col: cabecera.index(col) for col in CABECERA_MAESTRO if col in cabecera}
    if "codigo_avesoft" not in idx or "descripcion" not in idx:
        return MaestroParseado(
            errores=["Faltan columnas obligatorias. Mínimo: codigo_avesoft;descripcion."]
        )

    resultado = MaestroParseado()

    def celda(fila: list[str], col: str) -> str:
        pos = idx.get(col)
        if pos is None or pos >= len(fila):
            return ""
        return fila[pos].strip()

    for n, fila in enumerate(filas_raw[1:], start=2):
        if not any(c.strip() for c in fila):
            continue
        codigo = celda(fila, "codigo_avesoft")
        descripcion = celda(fila, "descripcion")
        if not codigo or not descripcion:
            resultado.errores.append(f"Línea {n}: código y descripción son obligatorios.")
            continue

        unidad = (celda(fila, "unidad_medida") or "kg").lower()
        if unidad not in _UNIDADES_VALIDAS:
            resultado.errores.append(f"Línea {n}: unidad '{unidad}' inválida (use kg, l o un).")
            continue

        try:
            tara = _numero(celda(fila, "peso_tara_kg"))
            stock_actual = _numero(celda(fila, "stock_actual")) or 0.0
            stock_minimo = _numero(celda(fila, "stock_minimo")) or 0.0
        except ValueError:
            resultado.errores.append(f"Línea {n}: valor numérico inválido.")
            continue

        proveedor = celda(fila, "proveedor") or None
        sustituto = celda(fila, "sustituto_id") or None

        resultado.filas.append(
            FilaMaestro(
                linea=n,
                codigo_avesoft=codigo,
                descripcion=descripcion,
                unidad_medida=unidad,
                proveedor=proveedor,
                peso_tara_kg=tara,
                stock_actual=stock_actual,
                stock_minimo=stock_minimo,
                sustituto_id=sustituto,
            )
        )

    return resultado


def generar_maestro_csv(filas: list[dict]) -> str:
    """Exporta el catálogo de productos en el mismo formato que se importa."""
    lineas = [";".join(CABECERA_MAESTRO)]
    for f in filas:
        lineas.append(";".join(str(f.get(col, "")) for col in CABECERA_MAESTRO))
    return "\r\n".join(lineas) + "\r\n"
