import asyncio
import math
import random
import unittest
from datetime import datetime
from api_inprocess import request
from estudios import (operador_maquina, balancear, calcular_estudio, plan_muestreo,
                      resumen_muestreo, wilson, tamano_muestreo)
from estudios_schemas import (OperadorMaquina, Balanceo, EstudioTiempos,
                             PlanMuestreo, ResumenMuestreo)
from calculos import calcular_elemento
from pydantic import ValidationError


def estudio(**changes):
    data = dict(elementos=[dict(id='E1', nombre='Preparar')],
                observaciones=[dict(elemento_id='E1', ciclo=i+1, lectura=v)
                               for i, v in enumerate([.5, .55, .48])])
    data.update(changes)
    return EstudioTiempos(**data)


def plan(**changes):
    data = dict(inicio='2026-11-09', fin='2026-11-13', dias_semana=[0, 1, 2, 3, 4],
                jornada_inicio='08:00', jornada_fin='17:00',
                descansos=[dict(inicio='12:00', fin='12:30')], semilla=42)
    data.update(changes)
    return PlanMuestreo(**data)


class OperadorTests(unittest.TestCase):
    def test_known_round_and_saturation(self):
        a = operador_maquina(OperadorMaquina(maquinas=3, servicio_min=1, automatico_min=4, traslado_min=.2))
        self.assertEqual(a['ciclo_min'], 5)
        self.assertEqual(a['produccion_h'], 36)
        self.assertAlmostEqual(a['ocupacion_operador_pct'], 72)
        self.assertAlmostEqual(a['espera_operador_min'], 1.4)
        b = operador_maquina(OperadorMaquina(maquinas=6, servicio_min=1, automatico_min=4, traslado_min=.2))
        self.assertAlmostEqual(b['produccion_h'], 50)
        self.assertAlmostEqual(b['espera_maquina_min'], 2.2)

    def test_each_timeline_partitions_the_complete_round(self):
        rng = random.Random(7)
        for n in [1, 2, 3, 8, 30]:
            for automatic in [0, .1, 10, 100]:
                r = operador_maquina(OperadorMaquina(maquinas=n, servicio_min=rng.uniform(.1, 2), automatico_min=automatic, traslado_min=rng.random()))
                for resource in ['Operador'] + [f'Máquina {k+1}' for k in range(n)]:
                    segments = sorted((s for s in r['segmentos'] if s['recurso'] == resource), key=lambda s: s['inicio'])
                    self.assertEqual(segments[0]['inicio'], 0)
                    self.assertAlmostEqual(segments[-1]['fin'], r['ciclo_min'])
                    for a, b in zip(segments, segments[1:]):
                        self.assertAlmostEqual(a['fin'], b['inicio'])
                    self.assertTrue(all(s['fin'] > s['inicio'] for s in segments))
                self.assertLessEqual(r['ocupacion_operador_pct'], 100.000001)


class BalanceoTests(unittest.TestCase):
    def task(self, key, t, previous=(), incompatible=()):
        return dict(id=key, nombre=key, tiempo_min=t, predecesoras=list(previous), incompatibles=list(incompatible))

    def test_diamond_counts_shared_successor_once(self):
        tasks = [self.task('A', 1), self.task('B', 2, ['A']), self.task('C', 2, ['A']), self.task('D', 1, ['B', 'C'])]
        r = balancear(Balanceo(tareas=tasks, ciclo_min=3))
        self.assertEqual(r['pesos'], {'A': 6, 'B': 3, 'C': 3, 'D': 1})
        self.assertEqual([s['tareas'] for s in r['estaciones']], [['A', 'B'], ['C', 'D']])
        self.assertEqual(r['eficiencia_pct'], 100)
        self.assertEqual(r, balancear(Balanceo(tareas=list(reversed(tasks)), ciclo_min=3)))

    def test_incompatibility_is_symmetric(self):
        tasks = [self.task('A', 1, incompatible=['B']), self.task('B', 1)]
        r = balancear(Balanceo(tareas=tasks, ciclo_min=2))
        self.assertEqual(len(r['estaciones']), 2)
        self.assertEqual(r['minimo_teorico'], 1)
        self.assertEqual(r['eficiencia_pct'], 50)

    def test_demand_sets_cycle(self):
        r = balancear(Balanceo(tareas=[self.task('A', 2)], modo='demanda', jornada_min=420, demanda=200))
        self.assertEqual(r['ciclo_min'], 2.1)
        self.assertEqual(r['produccion_objetivo'], 200)

    def test_invalid_graphs_and_oversized_task(self):
        cases = [[self.task('A', 1), self.task('A', 1)],
                 [self.task('A', 1, ['X'])], [self.task('A', 1, ['A'])],
                 [self.task('A', 1, ['B']), self.task('B', 1, ['A'])], [self.task('A', 3)]]
        for tasks in cases:
            with self.subTest(tasks=tasks), self.assertRaises(ValueError):
                balancear(Balanceo(tareas=tasks, ciclo_min=2))

    def test_generated_dags_respect_load_and_precedence(self):
        rng = random.Random(8)
        for _ in range(20):
            tasks = [self.task(str(i), rng.uniform(.1, 3), [str(j) for j in range(i) if rng.random() < .15]) for i in range(30)]
            r = balancear(Balanceo(tareas=tasks, ciclo_min=5))
            order = [t for s in r['estaciones'] for t in s['tareas']]
            self.assertEqual(len(order), len(set(order)))
            self.assertEqual(len(order), 30)
            self.assertTrue(all(s['carga_min'] <= 5.0000001 for s in r['estaciones']))
            for t in tasks:
                self.assertTrue(all(order.index(p) < order.index(t['id']) for p in t['predecesoras']))


class TiemposTests(unittest.TestCase):
    def test_same_standard_time_as_existing_module(self):
        d = estudio()
        r = calcular_estudio(d)['elementos'][0]
        old = calcular_elemento(dict(nombre='Preparar', lecturas=[.5, .55, .48], calificacion=d.elementos[0].calificacion.model_dump(), suplementos={}))
        self.assertEqual(round(r['estandar_min'], 4), old['tiempo_estandar'])
        self.assertAlmostEqual(r['suplementos_pct'], 9)

    def test_units_preserve_standard_time(self):
        expected = calcular_estudio(estudio())['total_estandar_min']
        for unit, f in [('seg', 60), ('centimin', 100)]:
            d = estudio(unidad=unit)
            for o in d.observaciones:
                o.lectura *= f
            self.assertAlmostEqual(calcular_estudio(d)['total_estandar_min'], expected)

    def test_continuous_exclusions_do_not_double_count(self):
        observations = [dict(elemento_id='E1', ciclo=i+1, lectura=value, tipo=kind, motivo='' if kind == 'normal' else 'Interrupción')
                        for i, (value, kind) in enumerate([(11, 'normal'), (14, 'ajena'), (16, 'atipica'), (18, 'normal')])]
        r = calcular_estudio(estudio(modo='continuo', lectura_inicial=10, tiempo_antes=1, tiempo_despues=1, tiempo_transcurrido=10, observaciones=observations))
        self.assertEqual([o['duracion_min'] for o in r['observaciones']], [1, 3, 2, 2])
        self.assertEqual(r['elementos'][0]['observado_min'], 1.5)
        self.assertEqual(r['control']['registrado_min'], 10)
        self.assertEqual(r['control']['diferencia_min'], 0)

    def test_individual_ratings_are_applied_before_averaging(self):
        obs = [dict(elemento_id='E1', ciclo=1, lectura=1, valoracion=200), dict(elemento_id='E1', ciclo=2, lectura=3, valoracion=100)]
        r = calcular_estudio(estudio(observaciones=obs, valoracion_modo='porcentaje_observacion', suplemento_modo='manual', suplemento_pct=10))['elementos'][0]
        self.assertEqual(r['normal_min'], 2.5)
        self.assertAlmostEqual(r['estandar_min'], 2.75)

    def test_single_reading_is_not_sufficient(self):
        r = calcular_estudio(estudio(observaciones=[dict(elemento_id='E1', ciclo=1, lectura=2)]))['elementos'][0]
        self.assertIsNone(r['n_recomendado'])
        self.assertFalse(r['muestra_suficiente'])

    def test_invalid_observations(self):
        cases = [dict(modo='continuo'),
                 dict(observaciones=[dict(elemento_id='E1', ciclo=1, lectura=0)]),
                 dict(observaciones=[dict(elemento_id='E1', ciclo=1, lectura=1, tipo='ajena')]),
                 dict(observaciones=[dict(elemento_id='unknown', ciclo=1, lectura=1)]),
                 dict(observaciones=[dict(elemento_id='E1', ciclo=1, lectura=1)] * 2),
                 dict(elementos=[dict(id='E1', nombre='A', suplementos={'desconocido': 'x'})]),
                 dict(elementos=[dict(id='E1', nombre='A', calificacion={'habilidad': 'invalid'})])]
        for changes in cases:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                calcular_estudio(estudio(**changes))

    def test_normal_approximation_sample_size(self):
        r = calcular_estudio(estudio(confianza=95, error_pct=5))['elementos'][0]
        expected = math.ceil((1.959963984540054 * r['desviacion_min'] / (.05 * r['observado_min'])) ** 2)
        self.assertEqual(r['n_recomendado'], expected)


class MuestreoTests(unittest.TestCase):
    def test_reproducible_unique_agenda_excludes_breaks(self):
        d = plan()
        r = plan_muestreo(d)
        self.assertEqual(r, plan_muestreo(d))
        self.assertEqual(r['n_requerido'], 385)
        self.assertEqual(r['minutos_disponibles'], 2550)
        self.assertEqual(len(set(r['agenda'])), 385)
        self.assertEqual(r['agenda'], sorted(r['agenda']))
        for stamp in r['agenda']:
            t = datetime.fromisoformat(stamp)
            self.assertLess(t.weekday(), 5)
            self.assertTrue(8 <= t.hour < 17)
            self.assertFalse(t.hour == 12 and t.minute < 30)

    def test_overnight_shift_counts_date_by_shift_start(self):
        r = plan_muestreo(plan(inicio='2026-11-09', fin='2026-11-09', jornada_inicio='22:00', jornada_fin='06:00', descansos=[dict(inicio='23:50', fin='00:10')], cantidad=460))
        self.assertEqual(r['minutos_disponibles'], 460)
        self.assertIn('2026-11-10T05:59', r['agenda'])
        self.assertNotIn('2026-11-10T00:00', r['agenda'])

    def test_invalid_period_capacity_and_breaks(self):
        cases = [dict(fin='2026-11-08'), dict(fin='2027-11-09'), dict(dias_semana=[8]),
                 dict(jornada_inicio='17:00'), dict(cantidad=5000),
                 dict(descansos=[dict(inicio='07:00', fin='08:30')]),
                 dict(descansos=[dict(inicio='12:00', fin='13:00'), dict(inicio='12:30', fin='13:30')])]
        for changes in cases:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                plan_muestreo(plan(**changes))

    def test_wilson_limits_and_reference(self):
        self.assertIsNone(wilson(0, 0, 95))
        lo, hi = wilson(50, 100, 95)
        self.assertAlmostEqual(lo, 40.383153, places=4)
        self.assertAlmostEqual(hi, 59.616847, places=4)
        self.assertAlmostEqual(wilson(0, 100, 95)[0], 0)
        self.assertAlmostEqual(wilson(100, 100, 95)[1], 100)

    def data(self):
        return dict(operadores=['Ana', 'Luis'], categorias=[dict(id='P', nombre='Productivo', productiva=True), dict(id='N', nombre='Espera')],
                    observaciones=[dict(momento='2026-11-09T08:00', operador='Ana', categoria='P'),
                                   dict(momento='2026-11-09T08:01', operador='Ana', categoria='N'),
                                   dict(momento='2026-11-09T08:02', operador='Ana'),
                                   dict(momento='2026-11-09T08:03', operador='Ana', omitida=True)])

    def test_pending_and_missing_excluded_per_operator(self):
        a, b = resumen_muestreo(ResumenMuestreo(**self.data()))['operadores']
        self.assertEqual((a['registradas'], a['pendientes'], a['omitidas']), (2, 1, 1))
        self.assertEqual(a['productividad_pct'], 50)
        self.assertEqual(sum(c['porcentaje'] for c in a['categorias']), 100)
        self.assertIsNone(b['productividad_pct'])
        self.assertIsNone(b['intervalo_productividad'])

    def test_reject_duplicate_or_ambiguous_record(self):
        for changes in [dict(omitida=True), dict(categoria='X'), dict(operador='X'), dict(momento='no-es-una-fecha-valida'), dict(momento='2026-11-09T08:00+00:00')]:
            d = self.data()
            d['observaciones'][0].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                resumen_muestreo(ResumenMuestreo(**d))
        d = self.data()
        d['observaciones'].append(d['observaciones'][0])
        with self.assertRaises(ValueError):
            resumen_muestreo(ResumenMuestreo(**d))


class IntegrationTests(unittest.TestCase):
    def call(self, path, data=None):
        return asyncio.run(request(path, data))

    def test_five_endpoints(self):
        for path, data, key in [('/api/operador-maquina', dict(maquinas=3, servicio_min=1, automatico_min=4), 'segmentos'),
                                ('/api/balanceo-lineas', dict(tareas=[dict(id='A', nombre='A', tiempo_min=1)]), 'estaciones'),
                                ('/api/estudio-tiempos', estudio().model_dump(mode='json'), 'total_estandar_min'),
                                ('/api/muestreo/plan', plan().model_dump(mode='json'), 'agenda'),
                                ('/api/muestreo/resumen', MuestreoTests().data(), 'operadores')]:
            with self.subTest(path=path):
                status, body = self.call(path, data)
                self.assertEqual(status, 200)
                self.assertIn(key, body)

    def test_validation_is_reported_as_400_or_422(self):
        self.assertEqual(self.call('/api/operador-maquina', dict(maquinas=0, servicio_min=1, automatico_min=2))[0], 422)
        status, body = self.call('/api/estudio-tiempos', estudio(modo='continuo').model_dump(mode='json'))
        self.assertEqual(status, 400)
        self.assertIn('deben aumentar', body['detail'])

    def test_previous_api_preserved(self):
        status, options = self.call('/api/opciones')
        self.assertEqual(status, 200)
        self.assertIn('westinghouse', options)
        self.assertEqual(self.call('/api/numero-observaciones', dict(lecturas=[1, 2, 3]))[0], 200)
        old = dict(nombre='A', lecturas=[1, 2, 3], calificacion=dict(habilidad='D', esfuerzo='D', condiciones='D', consistencia='D'))
        status, result = self.call('/api/tiempo-estandar', dict(elementos=[old]))
        self.assertEqual(status, 200)
        self.assertAlmostEqual(result['tiempo_estandar_total'], 2.18)

    def test_pages_and_assets_are_served(self):
        for path in ['/index.html', '/operador-maquina.html', '/registro-analisis.html', '/balanceo-lineas.html', '/muestreo-trabajo.html', '/estudios-comun.js', '/estudios.css', '/ishikawa.html', '/pareto.html', '/recorrido.html', '/diagrama-flujo.html']:
            with self.subTest(path=path):
                self.assertEqual(self.call(path)[0], 200)

    def test_nonfinite_numbers_rejected(self):
        for value in [float('inf'), float('nan'), -1]:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                OperadorMaquina(maquinas=1, servicio_min=value, automatico_min=2)


if __name__ == '__main__':
    unittest.main()
