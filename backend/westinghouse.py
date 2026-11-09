# -*- coding: utf-8 -*-
"""
Tabla de calificación Westinghouse (Niebel, Ingeniería Industrial:
Métodos, estándares y diseño del trabajo).

Cada factor tiene niveles con un valor decimal que se suma para
obtener el factor de calificación total:

    C = 1 + (habilidad + esfuerzo + condiciones + consistencia)

Los cuatro valores se seleccionan de forma independiente.
"""

HABILIDAD = {
    "A1": {"etiqueta": "A1 — Superhábil", "valor": 0.15},
    "A2": {"etiqueta": "A2 — Superhábil", "valor": 0.13},
    "B1": {"etiqueta": "B1 — Excelente", "valor": 0.11},
    "B2": {"etiqueta": "B2 — Excelente", "valor": 0.08},
    "C1": {"etiqueta": "C1 — Bueno", "valor": 0.06},
    "C2": {"etiqueta": "C2 — Bueno", "valor": 0.03},
    "D":  {"etiqueta": "D — Promedio", "valor": 0.00},
    "E1": {"etiqueta": "E1 — Regular", "valor": -0.05},
    "E2": {"etiqueta": "E2 — Regular", "valor": -0.10},
    "F1": {"etiqueta": "F1 — Deficiente", "valor": -0.16},
    "F2": {"etiqueta": "F2 — Deficiente", "valor": -0.22},
}

ESFUERZO = {
    "A1": {"etiqueta": "A1 — Excesivo", "valor": 0.13},
    "A2": {"etiqueta": "A2 — Excesivo", "valor": 0.12},
    "B1": {"etiqueta": "B1 — Excelente", "valor": 0.10},
    "B2": {"etiqueta": "B2 — Excelente", "valor": 0.08},
    "C1": {"etiqueta": "C1 — Bueno", "valor": 0.05},
    "C2": {"etiqueta": "C2 — Bueno", "valor": 0.02},
    "D":  {"etiqueta": "D — Promedio", "valor": 0.00},
    "E1": {"etiqueta": "E1 — Regular", "valor": -0.04},
    "E2": {"etiqueta": "E2 — Regular", "valor": -0.08},
    "F1": {"etiqueta": "F1 — Deficiente", "valor": -0.12},
    "F2": {"etiqueta": "F2 — Deficiente", "valor": -0.17},
}

CONDICIONES = {
    "A": {"etiqueta": "A — Ideales", "valor": 0.06},
    "B": {"etiqueta": "B — Excelentes", "valor": 0.04},
    "C": {"etiqueta": "C — Buenas", "valor": 0.02},
    "D": {"etiqueta": "D — Promedio", "valor": 0.00},
    "E": {"etiqueta": "E — Regulares", "valor": -0.03},
    "F": {"etiqueta": "F — Deficientes", "valor": -0.07},
}

CONSISTENCIA = {
    "A": {"etiqueta": "A — Perfecta", "valor": 0.04},
    "B": {"etiqueta": "B — Excelente", "valor": 0.03},
    "C": {"etiqueta": "C — Buena", "valor": 0.01},
    "D": {"etiqueta": "D — Promedio", "valor": 0.00},
    "E": {"etiqueta": "E — Regular", "valor": -0.02},
    "F": {"etiqueta": "F — Deficiente", "valor": -0.04},
}

TABLAS = {
    "habilidad": HABILIDAD,
    "esfuerzo": ESFUERZO,
    "condiciones": CONDICIONES,
    "consistencia": CONSISTENCIA,
}


def factor_calificacion(habilidad: str, esfuerzo: str, condiciones: str, consistencia: str) -> float:
    """Devuelve el factor de calificación C (ej. 1.09 = 109%)."""
    try:
        suma = (
            HABILIDAD[habilidad]["valor"]
            + ESFUERZO[esfuerzo]["valor"]
            + CONDICIONES[condiciones]["valor"]
            + CONSISTENCIA[consistencia]["valor"]
        )
    except KeyError as exc:
        raise ValueError(f"Nivel de calificación inválido: {exc}") from exc

    return 1 + suma
