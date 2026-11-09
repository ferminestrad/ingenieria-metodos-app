# -*- coding: utf-8 -*-
"""
Tabla de suplementos (tolerancias) de la OIT, tal como la retoma
Niebel. Los porcentajes son aproximaciones estándar de uso docente;
si tu profesor usa una edición del libro con valores distintos,
ajusta los números en este archivo — el resto de la app no cambia.

Suplementos constantes: se aplican siempre.
Suplementos variables: el usuario elige un nivel por categoría.
"""

CONSTANTES = {
    "personales": {"etiqueta": "Necesidades personales", "valor": 0.05},
    "fatiga_basica": {"etiqueta": "Fatiga básica", "valor": 0.04},
}

VARIABLES = {
    "de_pie": {
        "etiqueta": "Trabajar de pie",
        "opciones": {
            "no": {"etiqueta": "No aplica", "valor": 0.00},
            "si": {"etiqueta": "Sí, todo el ciclo", "valor": 0.02},
        },
    },
    "postura_anormal": {
        "etiqueta": "Postura anormal",
        "opciones": {
            "normal": {"etiqueta": "Normal", "valor": 0.00},
            "ligeramente_incomoda": {"etiqueta": "Ligeramente incómoda", "valor": 0.00},
            "incomoda": {"etiqueta": "Incómoda (agachado, estirado)", "valor": 0.02},
            "muy_incomoda": {"etiqueta": "Muy incómoda (tendido, muy estirado)", "valor": 0.07},
        },
    },
    "uso_de_fuerza": {
        "etiqueta": "Uso de fuerza / energía muscular (peso levantado)",
        "opciones": {
            "2.5kg": {"etiqueta": "2.5 kg", "valor": 0.00},
            "5kg": {"etiqueta": "5 kg", "valor": 0.01},
            "7.5kg": {"etiqueta": "7.5 kg", "valor": 0.02},
            "10kg": {"etiqueta": "10 kg", "valor": 0.03},
            "12.5kg": {"etiqueta": "12.5 kg", "valor": 0.04},
            "15kg": {"etiqueta": "15 kg", "valor": 0.05},
            "17.5kg": {"etiqueta": "17.5 kg", "valor": 0.07},
            "20kg": {"etiqueta": "20 kg", "valor": 0.09},
            "22.5kg": {"etiqueta": "22.5 kg", "valor": 0.11},
            "25kg": {"etiqueta": "25 kg", "valor": 0.13},
            "30kg": {"etiqueta": "30 kg", "valor": 0.17},
            "40kg": {"etiqueta": "40 kg", "valor": 0.22},
            "50kg": {"etiqueta": "50 kg", "valor": 0.28},
        },
    },
    "iluminacion": {
        "etiqueta": "Iluminación",
        "opciones": {
            "adecuada": {"etiqueta": "Adecuada", "valor": 0.00},
            "ligeramente_inferior": {"etiqueta": "Ligeramente inferior a la recomendada", "valor": 0.00},
            "bastante_inferior": {"etiqueta": "Bastante inferior a la recomendada", "valor": 0.02},
            "muy_inadecuada": {"etiqueta": "Muy inadecuada", "valor": 0.05},
        },
    },
    "condiciones_atmosfericas": {
        "etiqueta": "Condiciones atmosféricas (calidad del aire)",
        "opciones": {
            "buena": {"etiqueta": "Buena", "valor": 0.00},
            "regular": {"etiqueta": "Regular", "valor": 0.05},
            "mala": {"etiqueta": "Mala", "valor": 0.10},
            "muy_mala": {"etiqueta": "Muy mala", "valor": 0.15},
        },
    },
    "tension_visual": {
        "etiqueta": "Tensión visual",
        "opciones": {
            "trabajo_cierta_precision": {"etiqueta": "Trabajo de cierta precisión", "valor": 0.00},
            "precision_o_fatigoso": {"etiqueta": "Precisión o fatigoso", "valor": 0.02},
            "muy_fino_limitado": {"etiqueta": "Trabajo muy fino / campo muy limitado", "valor": 0.05},
        },
    },
    "nivel_ruido": {
        "etiqueta": "Nivel de ruido",
        "opciones": {
            "continuo": {"etiqueta": "Continuo", "valor": 0.00},
            "intermitente_fuerte": {"etiqueta": "Intermitente y fuerte", "valor": 0.02},
            "intermitente_muy_fuerte": {"etiqueta": "Intermitente y muy fuerte", "valor": 0.05},
            "estridente": {"etiqueta": "Estridente y fuerte", "valor": 0.05},
        },
    },
    "esfuerzo_mental": {
        "etiqueta": "Proceso mental / esfuerzo mental",
        "opciones": {
            "bastante_complejo": {"etiqueta": "Proceso bastante complejo", "valor": 0.01},
            "complejo_o_amplio": {"etiqueta": "Complejo o amplio campo de atención", "valor": 0.04},
            "muy_complejo": {"etiqueta": "Muy complejo", "valor": 0.08},
        },
    },
    "monotonia": {
        "etiqueta": "Monotonía",
        "opciones": {
            "baja": {"etiqueta": "Baja", "valor": 0.00},
            "media": {"etiqueta": "Media", "valor": 0.01},
            "alta": {"etiqueta": "Alta", "valor": 0.04},
        },
    },
    "tedio": {
        "etiqueta": "Tedio",
        "opciones": {
            "algo_tedioso": {"etiqueta": "Algo tedioso", "valor": 0.00},
            "tedioso": {"etiqueta": "Tedioso", "valor": 0.02},
            "muy_tedioso": {"etiqueta": "Muy tedioso", "valor": 0.05},
        },
    },
}


def porcentaje_constantes() -> float:
    return sum(c["valor"] for c in CONSTANTES.values())


def porcentaje_variables(seleccion: dict) -> float:
    """
    seleccion: { "de_pie": "si", "postura_anormal": "incomoda", ... }
    Categorías omitidas se toman como su primera opción (0%).
    """
    total = 0.0
    for categoria, opcion_elegida in (seleccion or {}).items():
        categoria_info = VARIABLES.get(categoria)
        if categoria_info is None:
            continue
        opcion_info = categoria_info["opciones"].get(opcion_elegida)
        if opcion_info is None:
            raise ValueError(f"Opción inválida '{opcion_elegida}' para '{categoria}'")
        total += opcion_info["valor"]
    return total


def porcentaje_total(seleccion: dict) -> float:
    return porcentaje_constantes() + porcentaje_variables(seleccion)
