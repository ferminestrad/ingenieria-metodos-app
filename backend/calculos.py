# -*- coding: utf-8 -*-
"""
Cálculos de estudio de tiempos según Niebel:

  1. Tiempo observado promedio (TO)
  2. Tamaño de muestra recomendado (método estadístico)
  3. Tiempo normal (TN = TO * C)
  4. Tiempo estándar (TS = TN * (1 + suplementos))
"""

import math

from westinghouse import factor_calificacion
from suplementos import porcentaje_total

# Valores Z para el método estadístico de número de observaciones.
# (aproximación de una distribución normal, dos colas)
Z_POR_CONFIANZA = {
    90.0: 1.65,
    95.0: 1.96,
    95.45: 2.00,
    99.0: 2.58,
}


def estadisticos_lecturas(lecturas: list[float]) -> dict:
    n = len(lecturas)
    if n == 0:
        raise ValueError("Se requiere al menos una lectura")

    media = sum(lecturas) / n

    if n > 1:
        varianza = sum((x - media) ** 2 for x in lecturas) / (n - 1)
        desviacion = math.sqrt(varianza)
    else:
        desviacion = 0.0

    return {"n": n, "media": media, "desviacion_estandar": desviacion}


def numero_observaciones_recomendado(
    lecturas: list[float],
    confianza: float = 95.45,
    error: float = 5.0,
) -> dict:
    """
    Método estadístico (Niebel): n' = (Z * s / (E * x̄))²
    confianza: 90 | 95 | 95.45 | 99   (%)
    error:     precisión deseada, en % del promedio (ej. 5 = ±5%)
    """
    stats = estadisticos_lecturas(lecturas)
    n_actual, media, s = stats["n"], stats["media"], stats["desviacion_estandar"]

    z = Z_POR_CONFIANZA.get(round(confianza, 2))
    if z is None:
        # valor de confianza no tabulado: usar el más cercano
        z = min(Z_POR_CONFIANZA.items(), key=lambda kv: abs(kv[0] - confianza))[1]

    e_frac = error / 100.0

    if media == 0:
        n_recomendado = n_actual
    else:
        n_recomendado = math.ceil(((z * s) / (e_frac * media)) ** 2) if n_actual > 1 else n_actual

    return {
        "n_actual": n_actual,
        "n_recomendado": max(n_recomendado, 1),
        "suficiente": n_actual >= n_recomendado,
        "desviacion_estandar": s,
    }


def calcular_elemento(elemento: dict) -> dict:
    """
    elemento = {
        "nombre": str,
        "lecturas": [float, ...],
        "unidad": "min" | "seg",
        "calificacion": {"habilidad":.., "esfuerzo":.., "condiciones":.., "consistencia":..},
        "suplementos": {"de_pie": "si", "postura_anormal": "incomoda", ...},
    }
    """
    lecturas = elemento["lecturas"]
    stats = estadisticos_lecturas(lecturas)
    tiempo_observado = stats["media"]

    c = elemento["calificacion"]
    factor_c = factor_calificacion(
        c["habilidad"], c["esfuerzo"], c["condiciones"], c["consistencia"]
    )
    tiempo_normal = tiempo_observado * factor_c

    pct_suplementos = porcentaje_total(elemento.get("suplementos", {}))
    tiempo_estandar = tiempo_normal * (1 + pct_suplementos)

    muestreo = numero_observaciones_recomendado(lecturas)

    return {
        "nombre": elemento["nombre"],
        "unidad": elemento.get("unidad", "min"),
        "n_lecturas": stats["n"],
        "tiempo_observado_promedio": round(tiempo_observado, 4),
        "desviacion_estandar": round(stats["desviacion_estandar"], 4),
        "factor_calificacion": round(factor_c, 4),
        "tiempo_normal": round(tiempo_normal, 4),
        "porcentaje_suplementos": round(pct_suplementos * 100, 2),
        "tiempo_estandar": round(tiempo_estandar, 4),
        "numero_observaciones_recomendado": muestreo["n_recomendado"],
        "muestra_suficiente": muestreo["suficiente"],
    }


def calcular_operacion(elementos: list[dict]) -> dict:
    resultados = [calcular_elemento(el) for el in elementos]
    total = sum(r["tiempo_estandar"] for r in resultados)
    return {
        "elementos": resultados,
        "tiempo_estandar_total": round(total, 4),
    }
