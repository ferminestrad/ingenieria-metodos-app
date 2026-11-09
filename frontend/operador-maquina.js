"use strict";
(() => {
    const U = Estudios;
    // Se mantiene la clave anterior para recuperar los estudios de Operador–Máquina.
    const initial = {
        titulo: '', modelo: 'sincronico', maquinas: 3, servicio_min: 1, automatico_min: 4,
        traslado_min: .2, salario_h: 0, costo_maquina_h: 0,
        aleatorio: {maquinas: 3, operadores: 1, probabilidad: .4, jornada_h: 8,
            produccion_maquina_h: 60, salario_h: 0, costo_maquina_h: 0},
        complejo: {maquinas: 60, servicio_min: 3, marcha_min: 150, metodo: 'wright',
            interferencia_pct: null, salario_h: 0, costo_maquina_h: 0}
    };
    const migrate = data => {
        if (data && !Object.hasOwn(data, 'modelo')) {
            return {...structuredClone(initial), ...data};
        }
        return data;
    };
    const validate = s => {
        if (!['sincronico','aleatorio','complejo'].includes(s.modelo)
            || !['wright','empirico'].includes(s.complejo.metodo)) throw new Error('Herramienta de Hombre–Máquina desconocida.');
    };
    const labels = {sincronico:'Servicio sincrónico', aleatorio:'Servicio aleatorio', complejo:'Relaciones complejas'};
    const c = U.init('operador-maquina', initial, render, validate, migrate);
    const money = value => U.fmt(value, 4) + ' u.m.';
    const pct = value => U.fmt(value, 2) + ' %';

    function render(c) {
        const s = c.state, d = s.modelo === 'sincronico' ? s : s[s.modelo];
        const field = (key, label, min = 0, max = 1000000, step = 'any') => U.campo(label,
            U.input(d[key], value => {d[key] = value; c.changed();}, {type:'number', label, min, max, step}));
        const tabs = U.actions(...Object.entries(labels).map(([value,label]) => {
            const b = U.button(label, () => {s.modelo=value;c.changed();c.render();}, s.modelo===value?'principal':'');
            b.setAttribute('aria-pressed', String(s.modelo===value)); return b;
        }));
        const panels = [tabs];
        if (s.modelo === 'sincronico') {
            panels.push(U.panel('Servicio sincrónico',
                U.ayuda('Una persona atiende máquinas idénticas en orden fijo. Cada atención corresponde a una pieza; el cronograma muestra una ronda en régimen estable.'),
                U.grid(field('maquinas','Número de máquinas',1,30,1),
                    field('servicio_min','Carga y descarga L (min)',.000001),
                    field('automatico_min','Tiempo automático M (min)'),
                    field('traslado_min','Trabajo externo y traslado W (min)')),
                U.ayuda('W incluye el trabajo de la persona fuera de la atención a la máquina y el traslado, incluido el regreso. La máquina se detiene durante L. C = máximo entre N(L + W) y L + M.')));
        } else if (s.modelo === 'aleatorio') {
            panels.push(U.panel('Servicio aleatorio',
                U.ayuda('Modelo binomial para máquinas iguales con solicitudes de atención independientes y la misma probabilidad p. Compara de una persona hasta una por máquina.'),
                U.grid(field('maquinas','Máquinas del grupo',1,100,1), field('operadores','Operadores disponibles',1,100,1),
                    field('probabilidad','Probabilidad de requerir atención p (0–1)',0,1,.01),
                    field('jornada_h','Duración de la jornada (h)',.000001,24),
                    field('produccion_maquina_h','Producción nominal por máquina (piezas/h)',.000001)),
                U.ayuda('La pérdida calculada es la espera adicional cuando hay más solicitudes que operadores. La producción ajustada descuenta solo esa interferencia; no descuenta por separado el tiempo propio del servicio, averías u otras pérdidas.')));
        } else {
            panels.push(U.panel('Relaciones complejas',
                U.ayuda('Una persona atiende máquinas con tiempos medios de marcha y servicio. Se estima la interferencia: espera causada por compartir a esa persona.'),
                U.grid(U.campo('Método de interferencia',U.select(d.metodo,[['wright','Wright · 7 o más máquinas'],['empirico','Interferencia de curva o medición']],value=>{d.metodo=value;c.changed();c.render();},'Método de interferencia')),
                    field('maquinas','Máquinas asignadas a una persona',1,200,1),
                    field('marcha_min','Tiempo medio de marcha M (min)',.000001),
                    field('servicio_min','Tiempo medio de servicio L (min)',.000001)),
                d.metodo==='empirico'?U.grid(field('interferencia_pct','Interferencia I (% del tiempo de servicio)',0,1000000)):null,
                U.ayuda(d.metodo==='wright'
                    ?'X = M/L; I = 50 × (√((1 + X − N)² + 2N) − (1 + X − N)). Es una aproximación para N ≥ 7. La espera por máquina es L × I/100.'
                    :'Introduce I leído de la curva correspondiente a N y X = M/L, o medido en tu estudio. No es el porcentaje de la jornada: 100 % de I significa una espera igual al tiempo de servicio.'),
                U.ayuda('Se supone una unidad por ciclo de marcha y servicio. El cálculo muestra promedios, no un orden de atención ni una simulación de eventos.')));
        }
        panels.push(U.panel('Costos por hora',U.grid(field('salario_h','Costo por operador y hora (u.m.)'),field('costo_maquina_h','Costo por máquina y hora (u.m.)')),
            U.ayuda('Usa la misma moneda para ambos costos y considera la hora completa, incluida la espera. Puedes dejarlos en cero para estudiar tiempos; entonces no se recomienda una asignación por costo.')));
        U.$('module-form').replaceChildren(...panels);
    }

    function showSync(r, d) {
        const legend = U.node('div',{class:'leyenda'},Object.entries({servicio:'Atención manual',automatico:'Automático',traslado:'Trabajo externo / traslado',espera:'Espera'})
            .map(([key,text])=>U.node('span',{},[U.node('i',{style:'background:'+U.palette[key]}),text])));
        return [U.panel('Servicio sincrónico · resultados',
            U.metrics([['Ciclo de la ronda',U.fmt(r.ciclo_min)+' min'],['Producción estable',U.fmt(r.produccion_h,2)+' piezas/h'],
                ['Ocupación de la persona',pct(r.ocupacion_operador_pct)],['Costo por pieza',money(r.costo_unitario)]]),
            U.ayuda(`N = ${d.maquinas}; L = ${d.servicio_min}; M = ${d.automatico_min}; W = ${d.traslado_min} min. Relación ideal (L + M)/(L + W): ${U.fmt(r.relacion_ideal)}.`),
            legend,U.timeline(['Operador',...Array.from({length:d.maquinas},(_,i)=>'Máquina '+(i+1))],r.ciclo_min,r.segmentos),
            U.table(['Recurso','Espera por ronda (min)'],[['Persona',U.fmt(r.espera_operador_min)],['Cada máquina',U.fmt(r.espera_maquina_min)]])),
            U.panel('Comparación de 1 a 30 máquinas',
                U.ayuda(r.recomendado===null?'Introduce costos para comparar económicamente las asignaciones.':`Menor costo por pieza dentro del rango comparado: ${r.recomendado} máquinas por persona.`),
                U.table(['Máquinas','Ciclo (min)','Piezas/h','Ocupación','Espera máquina (min)','Costo/pieza'],r.comparacion.map(x=>[x.maquinas,U.fmt(x.ciclo_min),U.fmt(x.produccion_h,2),pct(x.ocupacion_operador_pct),U.fmt(x.espera_maquina_min),money(x.costo_unitario)])))];
    }
    function showRandom(r, d) {
        return [U.panel('Servicio aleatorio · resultados',
            U.ayuda(`${d.maquinas} máquinas · ${d.operadores} operadores · p = ${d.probabilidad} · Jornada: ${d.jornada_h} h. Producción nominal: ${d.produccion_maquina_h} piezas por máquina/h.`),
            U.metrics([['Horas-máquina perdidas',U.fmt(r.horas_maquina_perdidas)],['Producción ajustada',U.fmt(r.produccion_h,2)+' piezas/h'],
                ['Piezas por jornada',U.fmt(r.produccion_jornada,2)],['Costo por pieza',money(r.costo_unitario)]]),
            U.ayuda(`Probabilidad de que alguna máquina espere: ${pct(r.probabilidad_espera*100)}. Ocupación media del conjunto de operadores: ${pct(r.ocupacion_operadores_pct)}. Se descuenta únicamente la interferencia por falta de atención.`),
            U.table(['Solicitudes simultáneas','Probabilidad','Máquinas sin atención','Horas perdidas esperadas'],r.distribucion.map(x=>[x.solicitudes,pct(x.probabilidad*100),x.maquinas_esperando,U.fmt(x.horas_perdidas,6)]))),
            U.panel('Comparación de operadores',
                U.ayuda(r.recomendado===null?'Introduce costos para obtener la alternativa de menor costo unitario.':`Menor costo por pieza en este modelo: ${r.recomendado} operadores.`),
                U.table(['Operadores','Horas-máquina perdidas','Producción ajustada/h','Costo/h','Costo/pieza'],r.comparacion.map(x=>[x.operadores,U.fmt(x.horas_maquina_perdidas),U.fmt(x.produccion_h,2),money(x.costo_h),money(x.costo_unitario)])))];
    }
    function showComplex(r, d) {
        return [U.panel('Relaciones complejas · resultados',
            U.ayuda(`${d.maquinas} máquinas por persona · M = ${d.marcha_min} min · L = ${d.servicio_min} min · Método: ${d.metodo==='wright'?'Wright':'Interferencia introducida'}.`),
            U.metrics([['Relación X = M/L',U.fmt(r.relacion_x)],['Interferencia I sobre L',pct(r.interferencia_pct)],
                ['Espera por máquina',U.fmt(r.espera_min)+' min'],['Ciclo medio',U.fmt(r.ciclo_min)+' min']]),
            U.table(['Componente por máquina','Minutos por ciclo','Porcentaje del ciclo'],[
                ['Marcha automática',U.fmt(d.marcha_min),pct(r.automatico_pct)],
                ['Servicio',U.fmt(d.servicio_min),pct(r.servicio_pct)],
                ['Espera por interferencia',U.fmt(r.espera_min),pct(r.espera_pct)]]),
            U.metrics([['Producción conjunta',U.fmt(r.produccion_h,2)+' piezas/h'],['Ocupación de la persona',pct(r.ocupacion_operador_pct)],['Costo por pieza',money(r.costo_unitario)]]),
            U.ayuda('I puede superar 100 % porque se expresa respecto al tiempo de servicio. El porcentaje de espera dentro del ciclo se presenta por separado.'))];
    }
    U.$('calcular').onclick = () => {
        const s=c.state, mode=s.modelo;
        const data=mode==='sincronico'?Object.fromEntries(['maquinas','servicio_min','automatico_min','traslado_min','salario_h','costo_maquina_h'].map(k=>[k,s[k]])):s[mode];
        c.run('/api/hombre-maquina/'+mode,data,r=>{
            const panels=mode==='sincronico'?showSync(r,data):mode==='aleatorio'?showRandom(r,data):showComplex(r,data);
            U.$('module-results').replaceChildren(...panels);
        });
    };
})();
