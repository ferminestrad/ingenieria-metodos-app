# -*- coding: utf-8 -*-
from pydantic import BaseModel, Field


class Calificacion(BaseModel):
    habilidad: str
    esfuerzo: str
    condiciones: str
    consistencia: str


class Elemento(BaseModel):
    nombre: str
    lecturas: list[float] = Field(min_length=1)
    unidad: str = "min"
    calificacion: Calificacion
    suplementos: dict[str, str] = {}


class SolicitudTiempoEstandar(BaseModel):
    elementos: list[Elemento] = Field(min_length=1)


class SolicitudNumeroObservaciones(BaseModel):
    lecturas: list[float] = Field(min_length=1)
    confianza: float = 95.45
    error: float = 5.0
