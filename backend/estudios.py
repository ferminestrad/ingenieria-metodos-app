"""Cálculos independientes de la interfaz. Véase docs/metodos-implementados.md."""
import math
import random
import statistics
from datetime import datetime, timedelta
from collections import Counter
from westinghouse import factor_calificacion
from suplementos import porcentaje_total, VARIABLES


def unico(valores, descripcion):
    if len(valores) != len(set(valores)):
        raise ValueError(f'Hay {descripcion} duplicados.')


def z_confianza(confianza):
    return statistics.NormalDist().inv_cdf(.5 + confianza / 200)


def operador_maquina(d):
    """Una persona, máquinas idénticas, servicio cíclico en régimen estable."""
    s, a, t = d.servicio_min, d.automatico_min, d.traslado_min
    def caso(n):
        ciclo = max(n * (s + t), s + a)
        return dict(maquinas=n, ciclo_min=ciclo, produccion_h=60 * n / ciclo,
                    ocupacion_operador_pct=100 * n * (s + t) / ciclo,
                    automatico_maquina_pct=100 * a / ciclo,
                    espera_operador_min=max(0, ciclo - n * (s + t)),
                    espera_maquina_min=max(0, ciclo - s - a))
    resultado = caso(d.maquinas)
    ciclo = resultado['ciclo_min']
    segmentos = []
    for i in range(d.maquinas):
        inicio = i * (s + t)
        segmentos.append(dict(recurso='Operador', estado='servicio', inicio=inicio, fin=inicio+s, detalle=f'Máquina {i+1}'))
        if t:
            segmentos.append(dict(recurso='Operador', estado='traslado', inicio=inicio+s, fin=inicio+s+t, detalle='Traslado'))
        for offset in (-ciclo, 0):
            p = inicio + offset
            for estado, x, y in [('servicio', p, p+s), ('automatico', p+s, p+s+a), ('espera', p+s+a, p+ciclo)]:
                x, y = max(0, x), min(ciclo, y)
                if y > x:
                    segmentos.append(dict(recurso=f'Máquina {i+1}', estado=estado, inicio=x, fin=y, detalle=estado))
    if resultado['espera_operador_min'] > 0:
        segmentos.append(dict(recurso='Operador', estado='espera', inicio=d.maquinas*(s+t), fin=ciclo, detalle='Espera'))
    resultado['segmentos'] = segmentos
    resultado['comparacion'] = [caso(n) for n in range(1, min(30, max(8, d.maquinas+2))+1)]
    return resultado


def balancear(d):
    tareas = {x.id: x for x in d.tareas}
    unico([x.id for x in d.tareas], 'identificadores de tareas')
    ciclo = d.jornada_min / d.demanda if d.modo == 'demanda' else d.ciclo_min
    sucesoras = {x: set() for x in tareas}
    for x in d.tareas:
        for dep in x.predecesoras + x.incompatibles:
            if dep not in tareas or dep == x.id:
                raise ValueError(f'Tarea {x.id}: referencia inválida a {dep}.')
        for dep in x.predecesoras:
            sucesoras[dep].add(x.id)
        if x.tiempo_min > ciclo + 1e-10:
            raise ValueError(f'La tarea {x.id} supera el ciclo disponible ({ciclo:.4f} min). Divide la tarea o aumenta el ciclo.')
    pendientes = set(tareas)
    orden = []
    while pendientes:
        libres = sorted(x for x in pendientes if set(tareas[x].predecesoras) <= set(orden))
        if not libres:
            raise ValueError('Las precedencias contienen un ciclo. Revisa las tareas relacionadas.')
        orden.extend(libres)
        pendientes.difference_update(libres)
    descendientes = {}
    for x in reversed(orden):
        descendientes[x] = set(sucesoras[x])
        for hijo in sucesoras[x]:
            descendientes[x].update(descendientes[hijo])
    pesos = {x: tareas[x].tiempo_min + sum(tareas[y].tiempo_min for y in descendientes[x]) for x in tareas}
    asignadas = set()
    estaciones = []
    while len(asignadas) < len(tareas):
        elegidas, carga = [], 0.0
        while True:
            candidatas = [x for x in tareas if x not in asignadas
                          and set(tareas[x].predecesoras) <= asignadas
                          and carga + tareas[x].tiempo_min <= ciclo + 1e-10
                          and all(y not in tareas[x].incompatibles and x not in tareas[y].incompatibles for y in elegidas)]
            if not candidatas:
                break
            x = sorted(candidatas, key=lambda x: (-pesos[x], -tareas[x].tiempo_min, x))[0]
            elegidas.append(x)
            carga += tareas[x].tiempo_min
            asignadas.add(x)
        if not elegidas:
            raise ValueError('No se pudo asignar una tarea con las restricciones indicadas.')
        estaciones.append(dict(numero=len(estaciones)+1, tareas=elegidas, carga_min=carga, ocio_min=max(0, ciclo-carga)))
    total = sum(x.tiempo_min for x in d.tareas)
    eficiencia = total / (len(estaciones)*ciclo)
    return dict(ciclo_min=ciclo, total_min=total, minimo_teorico=math.ceil(round(total/ciclo, 12)),
                estaciones=estaciones, eficiencia_pct=eficiencia*100, retraso_pct=(1-eficiencia)*100,
                produccion_objetivo=math.floor(d.jornada_min/ciclo+1e-9), pesos=pesos)


def calcular_estudio(d):
    ids = [e.id for e in d.elementos]
    unico(ids, 'identificadores de elementos')
    por_id = {e.id: e for e in d.elementos}
    factor_unidad = {'min': 1, 'seg': 1/60, 'centimin': .01}[d.unidad]
    grupos = {x: [] for x in ids}
    anterior = d.lectura_inicial
    detalle = []
    totales = Counter()
    vistas = set()
    for i, o in enumerate(d.observaciones):
        if o.elemento_id not in por_id:
            raise ValueError(f'Observación {i+1}: el elemento no existe.')
        duracion = o.lectura - anterior if d.modo == 'continuo' else o.lectura
        anterior = o.lectura
        if duracion <= 0:
            raise ValueError(f'Observación {i+1}: la duración debe ser positiva; en modo continuo las lecturas deben aumentar.')
        if o.tipo != 'normal' and not o.motivo:
            raise ValueError(f'Observación {i+1}: escribe el motivo de exclusión.')
        if o.tipo == 'normal':
            clave = (o.elemento_id, o.ciclo)
            if clave in vistas:
                raise ValueError(f'Observación duplicada del elemento {o.elemento_id} en ciclo {o.ciclo}.')
            vistas.add(clave)
        duracion *= factor_unidad
        el = por_id[o.elemento_id]
        if d.valoracion_modo.startswith('westinghouse'):
            c = d.calificacion_global if d.valoracion_modo == 'westinghouse_global' else el.calificacion
            factor = factor_calificacion(**c.model_dump())
        else:
            factor = (o.valoracion if d.valoracion_modo == 'porcentaje_observacion' else d.valoracion_global) / 100
        tn = duracion * factor
        if o.tipo == 'normal':
            grupos[o.elemento_id].append((duracion, tn, factor))
        totales[o.tipo] += duracion
        detalle.append(dict(numero=i+1, elemento_id=o.elemento_id, ciclo=o.ciclo, tipo=o.tipo, duracion_min=duracion, normal_min=tn if o.tipo=='normal' else None))
    resultados = []
    for el in d.elementos:
        datos = grupos[el.id]
        if not datos:
            raise ValueError(f'El elemento «{el.nombre}» no tiene observaciones normales. Agrega una o elimina el elemento.')
        if set(el.suplementos) - set(VARIABLES):
            raise ValueError(f'El elemento {el.nombre} contiene suplementos desconocidos.')
        lecturas = [x[0] for x in datos]
        media = statistics.mean(lecturas)
        tn = statistics.mean(x[1] for x in datos)
        sd = statistics.stdev(lecturas) if len(lecturas)>1 else None
        n = max(2, math.ceil((z_confianza(d.confianza)*(sd/media)/(d.error_pct/100))**2)) if sd is not None else None
        sup = d.suplemento_pct/100 if d.suplemento_modo=='manual' else porcentaje_total(el.suplementos)
        resultados.append(dict(id=el.id, nombre=el.nombre, n=len(datos), observado_min=media,
                               desviacion_min=sd, factor_equivalente=tn/media, normal_min=tn,
                               suplementos_pct=sup*100, estandar_min=tn*(1+sup), n_recomendado=n,
                               muestra_suficiente=n is not None and len(datos)>=n))
    registrado = sum(totales.values()) + (d.tiempo_antes+d.tiempo_despues)*factor_unidad
    transcurrido = d.tiempo_transcurrido*factor_unidad if d.tiempo_transcurrido is not None else None
    diferencia = registrado-transcurrido if transcurrido is not None else None
    return dict(elementos=resultados, observaciones=detalle,
                total_estandar_min=sum(x['estandar_min'] for x in resultados),
                control=dict(normal_min=totales['normal'], atipica_min=totales['atipica'], ajena_min=totales['ajena'],
                             registrado_min=registrado, transcurrido_min=transcurrido,
                             diferencia_min=diferencia, error_pct=100*diferencia/transcurrido if transcurrido else None))


def tamano_muestreo(p, confianza, error_pp):
    return math.ceil(z_confianza(confianza)**2 * p * (1-p) / (error_pp/100)**2)


def plan_muestreo(d):
    if not 0 <= (d.fin-d.inicio).days <= 90:
        raise ValueError('El periodo debe abarcar entre 1 y 91 días, en orden cronológico.')
    if any(x not in range(7) for x in d.dias_semana):
        raise ValueError('Día de semana inválido.')
    def minutos(t):
        if t.second or t.microsecond or t.tzinfo:
            raise ValueError('Utiliza horas locales con precisión de minutos.')
        return t.hour*60+t.minute
    inicio, fin = minutos(d.jornada_inicio), minutos(d.jornada_fin)
    if inicio == fin:
        raise ValueError('La jornada debe tener una hora de inicio y fin diferentes.')
    nocturna = fin < inicio
    if nocturna: fin += 1440
    descansos = []
    for descanso in d.descansos:
        x, y = minutos(descanso.inicio), minutos(descanso.fin)
        if nocturna and x < inicio: x += 1440
        if nocturna and y < inicio: y += 1440
        if not inicio <= x < y <= fin:
            raise ValueError('Cada descanso debe quedar dentro de la jornada y tener inicio anterior al fin.')
        descansos.append((x,y))
    descansos.sort()
    if any(b[0]<a[1] for a,b in zip(descansos, descansos[1:])):
        raise ValueError('Hay descansos superpuestos.')
    disponibles = []
    dia = d.inicio
    while dia <= d.fin:
        if dia.weekday() in d.dias_semana:
            base = datetime.combine(dia, datetime.min.time())
            disponibles.extend(base+timedelta(minutes=m) for m in range(inicio, fin)
                               if not any(x<=m<y for x,y in descansos))
        dia += timedelta(days=1)
    requerido = tamano_muestreo(d.probabilidad, d.confianza, d.error_pp)
    cantidad = d.cantidad if d.cantidad is not None else requerido
    if cantidad > 5000:
        raise ValueError(f'El cálculo requiere {requerido} visitas por operador. El máximo por agenda es 5000; distribuye el estudio en varias agendas.')
    if cantidad > len(disponibles):
        raise ValueError(f'Solo hay {len(disponibles)} minutos disponibles para {cantidad} visitas. Amplía el periodo o reduce la cantidad.')
    seleccion = sorted(random.Random(d.semilla).sample(disponibles, cantidad))
    return dict(n_requerido=requerido, visitas=cantidad, minutos_disponibles=len(disponibles),
                agenda=[x.isoformat(timespec='minutes') for x in seleccion])


def wilson(k, n, confianza):
    if not n: return None
    z = z_confianza(confianza)
    p = k/n
    den = 1+z*z/n
    centro = (p+z*z/(2*n))/den
    margen = z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [max(0, centro-margen)*100, min(1, centro+margen)*100]


def resumen_muestreo(d):
    unico(d.operadores, 'nombres de operadores')
    unico([x.id for x in d.categorias], 'identificadores de categorías')
    cats = {x.id:x for x in d.categorias}
    registros = {x:[] for x in d.operadores}
    vistas = set()
    for o in d.observaciones:
        if o.operador not in registros or (o.categoria is not None and o.categoria not in cats):
            raise ValueError('Una observación hace referencia a un operador o categoría inexistente.')
        try:
            instante = datetime.fromisoformat(o.momento)
        except ValueError:
            raise ValueError('La fecha/hora de una observación no es válida.')
        if instante.tzinfo or instante.second or instante.microsecond:
            raise ValueError('Registra la hora local de observación con precisión de minutos.')
        clave=(instante,o.operador)
        if clave in vistas: raise ValueError('Hay una visita duplicada para el mismo operador y momento.')
        vistas.add(clave)
        if o.omitida and o.categoria is not None:
            raise ValueError('Una visita omitida no puede tener una categoría registrada.')
        registros[o.operador].append(o)
    operadores = []
    for nombre, obs in registros.items():
        cont = Counter(x.categoria for x in obs if not x.omitida and x.categoria is not None)
        n = sum(cont.values())
        k = sum(cont[c] for c in cats if cats[c].productiva)
        categorias = [dict(id=c.id,nombre=c.nombre,n=cont[c.id],porcentaje=100*cont[c.id]/n if n else None,
                           intervalo=wilson(cont[c.id],n,d.confianza)) for c in d.categorias]
        operadores.append(dict(nombre=nombre, registradas=n, omitidas=sum(x.omitida for x in obs),
                               pendientes=sum(not x.omitida and x.categoria is None for x in obs),
                               productivas=k, productividad_pct=100*k/n if n else None,
                               intervalo_productividad=wilson(k,n,d.confianza), categorias=categorias))
    return dict(n_requerido=tamano_muestreo(d.probabilidad,d.confianza,d.error_pp), operadores=operadores,
                registradas=sum(x['registradas'] for x in operadores))
