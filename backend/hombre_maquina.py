"""Herramientas cuantitativas de Hombre–Máquina; supuestos en docs/hombre-maquina.md."""
import math
from typing import Literal
from pydantic import Field
from estudios_schemas import Entrada, OperadorMaquina, Positivo, NoNegativo
from estudios import operador_maquina


class Sincronico(OperadorMaquina):
    salario_h: NoNegativo = 0
    costo_maquina_h: NoNegativo = 0


class Aleatorio(Entrada):
    maquinas: int = Field(ge=1, le=100)
    operadores: int = Field(ge=1, le=100)
    probabilidad: float = Field(ge=0, le=1, allow_inf_nan=False)
    jornada_h: float = Field(gt=0, le=24, allow_inf_nan=False)
    produccion_maquina_h: Positivo
    salario_h: NoNegativo = 0
    costo_maquina_h: NoNegativo = 0


class Complejo(Entrada):
    maquinas: int = Field(ge=1, le=200)
    servicio_min: Positivo
    marcha_min: Positivo
    metodo: Literal['wright', 'empirico'] = 'wright'
    interferencia_pct: NoNegativo | None = None
    salario_h: NoNegativo = 0
    costo_maquina_h: NoNegativo = 0


def mejor_por_costo(casos, hay_costos, campo):
    if not hay_costos:
        return None
    return min(casos, key=lambda c: (c['costo_unitario'], c[campo]))[campo]


def sincronico(d):
    resultado = operador_maquina(d)
    for segmento in resultado['segmentos']:
        if segmento['estado'] == 'traslado':
            segmento['detalle'] = 'Trabajo externo / traslado'
    # Se explora todo el rango admitido, no solo los enteros vecinos del cociente ideal.
    casos = []
    for n in range(1, 31):
        ciclo = max(n * (d.servicio_min + d.traslado_min), d.servicio_min + d.automatico_min)
        produccion = 60 * n / ciclo
        casos.append(dict(maquinas=n, ciclo_min=ciclo, produccion_h=produccion,
                          espera_operador_min=max(0, ciclo-n*(d.servicio_min+d.traslado_min)),
                          espera_maquina_min=max(0, ciclo-d.servicio_min-d.automatico_min),
                          ocupacion_operador_pct=100*n*(d.servicio_min+d.traslado_min)/ciclo,
                          costo_h=d.salario_h+n*d.costo_maquina_h,
                          costo_unitario=(d.salario_h+n*d.costo_maquina_h)/produccion))
    resultado.update(casos[d.maquinas-1])
    resultado.update(comparacion=casos,
                     relacion_ideal=(d.servicio_min+d.automatico_min)/(d.servicio_min+d.traslado_min),
                     recomendado=mejor_por_costo(casos, d.salario_h+d.costo_maquina_h > 0, 'maquinas'))
    return resultado


def aleatorio(d):
    if d.operadores > d.maquinas:
        raise ValueError('El número de operadores no debe superar el de máquinas en esta comparación.')
    n, p = d.maquinas, d.probabilidad
    probabilidades = [math.comb(n, k) * p**k * (1-p)**(n-k) for k in range(n+1)]

    def caso(operadores):
        espera = math.fsum(max(0, k-operadores)*prob for k, prob in enumerate(probabilidades))
        horas_perdidas = espera*d.jornada_h
        # Modelo binomial de interferencia: solo se descuenta la falta de atención.
        produccion_h = (n-espera)*d.produccion_maquina_h
        return dict(operadores=operadores, maquinas_esperando=espera,
                    probabilidad_espera=math.fsum(probabilidades[operadores+1:]),
                    horas_maquina_perdidas=horas_perdidas,
                    horas_maquina_ajustadas=n*d.jornada_h-horas_perdidas,
                    interferencia_pct=100*espera/n,
                    ocupacion_operadores_pct=100*math.fsum(min(k,operadores)*prob for k,prob in enumerate(probabilidades))/operadores,
                    produccion_h=produccion_h, produccion_jornada=produccion_h*d.jornada_h,
                    costo_h=operadores*d.salario_h+n*d.costo_maquina_h,
                    costo_unitario=(operadores*d.salario_h+n*d.costo_maquina_h)/produccion_h)

    comparacion = [caso(r) for r in range(1, n+1)]
    resultado = comparacion[d.operadores-1].copy()
    resultado['distribucion'] = [dict(solicitudes=k, probabilidad=prob,
                                    maquinas_esperando=max(0,k-d.operadores),
                                    horas_perdidas=max(0,k-d.operadores)*prob*d.jornada_h)
                                for k,prob in enumerate(probabilidades)]
    resultado['comparacion'] = comparacion
    resultado['recomendado'] = mejor_por_costo(comparacion, d.salario_h+d.costo_maquina_h > 0, 'operadores')
    return resultado


def complejo(d):
    x = d.marcha_min/d.servicio_min
    if d.metodo == 'wright':
        if d.maquinas < 7:
            raise ValueError('Wright se aplica a 7 o más máquinas. Para grupos menores usa la interferencia de una curva o medición.')
        delta = 1+x-d.maquinas
        raiz = math.hypot(delta, math.sqrt(2*d.maquinas))
        # Forma racionalizada para evitar cancelación cuando X es muy grande.
        interferencia = 100*d.maquinas/(raiz+delta) if delta >= 0 else 50*(raiz-delta)
    else:
        if d.interferencia_pct is None:
            raise ValueError('Indica la interferencia como porcentaje del tiempo medio de servicio.')
        interferencia = d.interferencia_pct
    espera = interferencia/100*d.servicio_min
    ciclo = d.marcha_min+d.servicio_min+espera
    ocupacion = d.maquinas*d.servicio_min/ciclo
    if ocupacion > 1+1e-10:
        raise ValueError('La interferencia indicada exige más del 100 % del tiempo de una persona. Revisa la lectura de la curva y los tiempos.')
    produccion = 60*d.maquinas/ciclo
    return dict(metodo=d.metodo, relacion_x=x, interferencia_pct=interferencia,
                espera_min=espera, ciclo_min=ciclo,
                automatico_pct=100*d.marcha_min/ciclo, servicio_pct=100*d.servicio_min/ciclo,
                espera_pct=100*espera/ciclo, ocupacion_operador_pct=100*ocupacion,
                produccion_h=produccion, costo_h=d.salario_h+d.maquinas*d.costo_maquina_h,
                costo_unitario=(d.salario_h+d.maquinas*d.costo_maquina_h)/produccion)
