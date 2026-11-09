"""Entradas explícitas para los cuatro módulos de medición del trabajo."""
from datetime import date, time
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Positivo = Annotated[float, Field(ge=0.000001, le=1000000, allow_inf_nan=False)]
NoNegativo = Annotated[float, Field(ge=0, le=1000000000, allow_inf_nan=False)]
Nombre = Annotated[str, Field(min_length=1, max_length=200)]
Identificador = Annotated[str, Field(pattern=r'^[A-Za-z0-9_-]{1,30}$')]

class Entrada(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class OperadorMaquina(Entrada):
    maquinas: int = Field(ge=1, le=30)
    servicio_min: Positivo
    automatico_min: NoNegativo
    traslado_min: NoNegativo = 0

class Tarea(Entrada):
    id: Identificador
    nombre: Nombre
    tiempo_min: Positivo
    predecesoras: list[Identificador] = Field(default_factory=list, max_length=200)
    incompatibles: list[Identificador] = Field(default_factory=list, max_length=200)

class Balanceo(Entrada):
    tareas: list[Tarea] = Field(min_length=1, max_length=200)
    modo: Literal['ciclo', 'demanda'] = 'ciclo'
    ciclo_min: Positivo = 1
    jornada_min: Positivo = 480
    demanda: int = Field(default=480, ge=1, le=10000000)

class CalificacionEstudio(Entrada):
    habilidad: str = 'D'
    esfuerzo: str = 'D'
    condiciones: str = 'D'
    consistencia: str = 'D'

class ElementoEstudio(Entrada):
    id: Identificador
    nombre: Nombre
    calificacion: CalificacionEstudio = Field(default_factory=CalificacionEstudio)
    suplementos: dict[str, str] = Field(default_factory=dict)

class ObservacionTiempo(Entrada):
    elemento_id: Identificador
    ciclo: int = Field(ge=1, le=100000)
    lectura: NoNegativo
    valoracion: float = Field(default=100, ge=0.01, le=300, allow_inf_nan=False)
    tipo: Literal['normal', 'atipica', 'ajena'] = 'normal'
    motivo: str = Field(default='', max_length=300)

class EstudioTiempos(Entrada):
    unidad: Literal['min', 'seg', 'centimin'] = 'min'
    modo: Literal['vuelta_cero', 'continuo'] = 'vuelta_cero'
    valoracion_modo: Literal['porcentaje_global', 'porcentaje_observacion', 'westinghouse_global', 'westinghouse_elemento'] = 'westinghouse_elemento'
    valoracion_global: float = Field(default=100, ge=0.01, le=300, allow_inf_nan=False)
    calificacion_global: CalificacionEstudio = Field(default_factory=CalificacionEstudio)
    suplemento_modo: Literal['tabla', 'manual'] = 'tabla'
    suplemento_pct: float = Field(default=9, ge=0, le=100, allow_inf_nan=False)
    confianza: float = Field(default=95.45, ge=80, le=99.9, allow_inf_nan=False)
    error_pct: float = Field(default=5, ge=0.01, le=50, allow_inf_nan=False)
    lectura_inicial: NoNegativo = 0
    tiempo_antes: NoNegativo = 0
    tiempo_despues: NoNegativo = 0
    tiempo_transcurrido: Positivo | None = None
    elementos: list[ElementoEstudio] = Field(min_length=1, max_length=200)
    observaciones: list[ObservacionTiempo] = Field(min_length=1, max_length=5000)

class Descanso(Entrada):
    inicio: time
    fin: time

class PlanMuestreo(Entrada):
    inicio: date
    fin: date
    dias_semana: list[int] = Field(min_length=1, max_length=7)
    jornada_inicio: time
    jornada_fin: time
    descansos: list[Descanso] = Field(default_factory=list, max_length=8)
    probabilidad: float = Field(default=.5, gt=0, lt=1, allow_inf_nan=False)
    confianza: float = Field(default=95, ge=80, le=99.9, allow_inf_nan=False)
    error_pp: float = Field(default=5, ge=0.01, le=50, allow_inf_nan=False)
    cantidad: int | None = Field(default=None, ge=1, le=5000)
    semilla: int | None = Field(default=None, ge=0, le=2147483647)

class CategoriaMuestreo(Entrada):
    id: Identificador
    nombre: Nombre
    productiva: bool = False

class RegistroMuestreo(Entrada):
    momento: str = Field(min_length=16, max_length=30)
    operador: Nombre
    categoria: Identificador | None = None
    omitida: bool = False
    nota: str = Field(default='', max_length=300)

class ResumenMuestreo(Entrada):
    operadores: list[Nombre] = Field(min_length=1, max_length=12)
    categorias: list[CategoriaMuestreo] = Field(min_length=2, max_length=20)
    observaciones: list[RegistroMuestreo] = Field(default_factory=list, max_length=60000)
    confianza: float = Field(default=95, ge=80, le=99.9, allow_inf_nan=False)
    probabilidad: float = Field(default=.5, gt=0, lt=1, allow_inf_nan=False)
    error_pp: float = Field(default=5, ge=0.01, le=50, allow_inf_nan=False)
