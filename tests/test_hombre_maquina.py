import asyncio
import math
import unittest
from pydantic import ValidationError
from api_inprocess import request
from hombre_maquina import Sincronico, Aleatorio, Complejo, sincronico, aleatorio, complejo


class HombreMaquinaTests(unittest.TestCase):
    def random_case(self, **changes):
        data = dict(maquinas=3, operadores=1, probabilidad=.4, jornada_h=8,
                    produccion_maquina_h=60, salario_h=10, costo_maquina_h=60)
        data.update(changes)
        return Aleatorio(**data)

    def test_synchronous_cost_minimum_in_search_range(self):
        result = sincronico(Sincronico(maquinas=3, servicio_min=1, automatico_min=3,
                                      traslado_min=.1, salario_h=10, costo_maquina_h=20))
        self.assertEqual(result['recomendado'], 3)
        self.assertAlmostEqual(result['relacion_ideal'], 4/1.1)
        self.assertAlmostEqual(result['costo_unitario'], 70/45)
        self.assertEqual(len(result['comparacion']), 30)
        self.assertEqual(result['costo_unitario'], min(x['costo_unitario'] for x in result['comparacion']))

    def test_zero_cost_does_not_recommend_assignment(self):
        self.assertIsNone(sincronico(Sincronico(maquinas=3, servicio_min=1, automatico_min=4))['recomendado'])
        self.assertIsNone(aleatorio(self.random_case(salario_h=0, costo_maquina_h=0))['recomendado'])

    def test_random_reference_three_machines(self):
        r = aleatorio(self.random_case())
        self.assertAlmostEqual(r['horas_maquina_perdidas'], 3.328)
        self.assertAlmostEqual(r['produccion_h'], 155.04)
        self.assertAlmostEqual(r['costo_unitario'], 190/155.04)
        self.assertEqual(r['recomendado'], 2)
        self.assertAlmostEqual(r['comparacion'][1]['horas_maquina_perdidas'], .512)
        self.assertAlmostEqual(r['comparacion'][1]['produccion_h'], 176.16)
        self.assertAlmostEqual(r['comparacion'][2]['produccion_h'], 180)

    def test_probability_distribution_and_loss_conservation(self):
        for n in [1, 3, 10, 100]:
            for p in [0, .001, .4, .99, 1]:
                r = aleatorio(self.random_case(maquinas=n, probabilidad=p))
                self.assertAlmostEqual(sum(x['probabilidad'] for x in r['distribucion']), 1)
                self.assertAlmostEqual(sum(x['horas_perdidas'] for x in r['distribucion']), r['horas_maquina_perdidas'])
                for c in r['comparacion']:
                    self.assertAlmostEqual(c['horas_maquina_ajustadas']+c['horas_maquina_perdidas'], n*8)
                    self.assertTrue(0 <= c['ocupacion_operadores_pct'] <= 100.000001)
                self.assertEqual(r['comparacion'][-1]['horas_maquina_perdidas'], 0)

    def test_random_more_workers_do_not_reduce_production(self):
        cases = aleatorio(self.random_case(maquinas=20))['comparacion']
        self.assertTrue(all(a['produccion_h'] <= b['produccion_h'] for a, b in zip(cases, cases[1:])))
        with self.assertRaises(ValueError):
            aleatorio(self.random_case(operadores=4))

    def test_wright_reference_sixty_spindles(self):
        r = complejo(Complejo(maquinas=60, servicio_min=3, marcha_min=150))
        expected = 50*(math.sqrt(201)+9)
        self.assertAlmostEqual(r['interferencia_pct'], expected)
        self.assertAlmostEqual(r['espera_min'], expected*3/100)
        self.assertAlmostEqual(r['ciclo_min'], 153+expected*3/100)
        self.assertEqual(round(r['interferencia_pct']), 1159)

    def test_wright_large_ratio_stays_positive_and_finite(self):
        r = complejo(Complejo(maquinas=7, servicio_min=.000001, marcha_min=1000000))
        self.assertGreater(r['interferencia_pct'], 0)
        self.assertTrue(math.isfinite(r['costo_unitario']))

    def test_wright_domain_and_empirical_missing_value(self):
        for changes in [dict(maquinas=6), dict(metodo='empirico')]:
            data = dict(maquinas=7, servicio_min=3, marcha_min=150)
            data.update(changes)
            with self.assertRaises(ValueError):
                complejo(Complejo(**data))

    def test_empirical_percent_is_relative_to_service(self):
        r = complejo(Complejo(maquinas=3, servicio_min=1, marcha_min=4, metodo='empirico', interferencia_pct=100, salario_h=12, costo_maquina_h=6))
        self.assertEqual(r['espera_min'], 1)
        self.assertEqual(r['ciclo_min'], 6)
        self.assertAlmostEqual(r['espera_pct'], 100/6)
        self.assertAlmostEqual(r['automatico_pct']+r['servicio_pct']+r['espera_pct'], 100)
        self.assertEqual(r['produccion_h'], 30)
        self.assertEqual(r['costo_unitario'], 1)

    def test_impossible_empirical_workload_rejected(self):
        with self.assertRaises(ValueError):
            complejo(Complejo(maquinas=10, servicio_min=1, marcha_min=1, metodo='empirico', interferencia_pct=0))

    def test_invalid_numeric_inputs(self):
        for changes in [dict(probabilidad=1.1), dict(jornada_h=0), dict(salario_h=-1), dict(produccion_maquina_h=float('inf'))]:
            with self.assertRaises(ValidationError):
                self.random_case(**changes)

    def test_new_routes_and_legacy_route(self):
        cases = [('sincronico', dict(maquinas=3, servicio_min=1, automatico_min=4)),
                 ('aleatorio', self.random_case().model_dump()),
                 ('complejo', dict(maquinas=60, servicio_min=3, marcha_min=150))]
        for name, data in cases:
            status, body = asyncio.run(request('/api/hombre-maquina/'+name, data))
            self.assertEqual(status, 200, body)
            self.assertIn('costo_unitario', body)
        self.assertEqual(asyncio.run(request('/api/operador-maquina', cases[0][1]))[0], 200)
        self.assertEqual(asyncio.run(request('/api/hombre-maquina/complejo', dict(maquinas=3, servicio_min=1, marcha_min=4)))[0], 400)


if __name__ == '__main__':
    unittest.main()
