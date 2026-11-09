# -*- coding: utf-8 -*-
"""
Backend de la plataforma de Ingeniería de Métodos.

Ejecutar (desde la carpeta backend/):
    uvicorn main:app --reload

Luego abre http://127.0.0.1:8000 en el navegador.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import suplementos
import westinghouse
from calculos import calcular_operacion, numero_observaciones_recomendado
from schemas import SolicitudNumeroObservaciones, SolicitudTiempoEstandar
from estudios_schemas import OperadorMaquina, Balanceo, EstudioTiempos, PlanMuestreo, ResumenMuestreo
from estudios import operador_maquina, balancear, calcular_estudio, plan_muestreo, resumen_muestreo
from hombre_maquina import Sincronico, Aleatorio, Complejo, sincronico, aleatorio, complejo

app = FastAPI(title="Ingeniería de Métodos — API")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/api/opciones")
def opciones():
    """
    Catálogo único (tablas Westinghouse + suplementos OIT) que el
    frontend usa para construir los selects. Cambia los valores en
    westinghouse.py / suplementos.py y se reflejan aquí solos.
    """
    return {
        "westinghouse": westinghouse.TABLAS,
        "suplementos": {
            "constantes": suplementos.CONSTANTES,
            "variables": suplementos.VARIABLES,
        },
    }


@app.post("/api/numero-observaciones")
def numero_observaciones(solicitud: SolicitudNumeroObservaciones):
    try:
        return numero_observaciones_recomendado(
            solicitud.lecturas, solicitud.confianza, solicitud.error
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/tiempo-estandar")
def tiempo_estandar(solicitud: SolicitudTiempoEstandar):
    try:
        elementos = [el.model_dump() for el in solicitud.elementos]
        return calcular_operacion(elementos)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def ejecutar_calculo(funcion, solicitud):
    try:
        return funcion(solicitud)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/operador-maquina")
def api_operador_maquina(solicitud: OperadorMaquina):
    return ejecutar_calculo(operador_maquina, solicitud)


@app.post("/api/balanceo-lineas")
def api_balanceo(solicitud: Balanceo):
    return ejecutar_calculo(balancear, solicitud)


@app.post("/api/estudio-tiempos")
def api_estudio(solicitud: EstudioTiempos):
    return ejecutar_calculo(calcular_estudio, solicitud)


@app.post("/api/muestreo/plan")
def api_plan(solicitud: PlanMuestreo):
    return ejecutar_calculo(plan_muestreo, solicitud)


@app.post("/api/muestreo/resumen")
def api_muestreo(solicitud: ResumenMuestreo):
    return ejecutar_calculo(resumen_muestreo, solicitud)


# Sirve el frontend estático (index.html, exploratorias.html, etc.)
@app.post('/api/hombre-maquina/sincronico')
def api_sincronico(solicitud: Sincronico):
    return ejecutar_calculo(sincronico, solicitud)


@app.post('/api/hombre-maquina/aleatorio')
def api_aleatorio(solicitud: Aleatorio):
    return ejecutar_calculo(aleatorio, solicitud)


@app.post('/api/hombre-maquina/complejo')
def api_complejo(solicitud: Complejo):
    return ejecutar_calculo(complejo, solicitud)


# Se monta al final para que las rutas /api/* tengan prioridad.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
