"use strict";
(() => {
    const P = Persistencia, $ = id => document.getElementById(id);
    const symbols = ['operacion', 'transporte', 'demora', 'inspeccion', 'almacen'];
    const lista = (rows, campo) => P.exigir(Array.isArray(rows) && rows.length <= 2000, campo);
    const ids = rows => P.exigir(rows.every(x => P.objeto(x) && Number.isSafeInteger(x.id) && x.id > 0)
        && new Set(rows.map(x => x.id)).size === rows.length, 'identificadores');
    const base = x => P.exigir(P.objeto(x), 'estudio');
    let config;

    if ($('ishikawa')) {
        const leer = () => ({problema: $('problema').value, causas: Object.fromEntries(CATEGORIAS.map(cat =>
            [cat.id, Array.from(document.querySelectorAll(`#inputs-${cat.id} .cause-input`), input => input.value)]))});
        config = {
            modulo: 'ishikawa', leer,
            inicial: {problema: '', causas: Object.fromEntries(CATEGORIAS.map(cat => [cat.id, ['']]))},
            validar(data) {
                base(data); P.exigir(P.texto(data.problema) && P.objeto(data.causas), 'problema y causas');
                for (const cat of CATEGORIAS) {
                    lista(data.causas[cat.id], cat.nombre);
                    P.exigir(data.causas[cat.id].every(P.texto), cat.nombre);
                }
            },
            aplicar(data) {
                $('problema').value = data.problema;
                for (const cat of CATEGORIAS) {
                    const inputs = data.causas[cat.id].map(text => {
                        const el = document.createElement('input');
                        el.type = 'text'; el.className = 'cause-input'; el.value = text;
                        el.placeholder = 'Escribe una causa'; el.setAttribute('aria-label', `Causa de ${cat.nombre}`);
                        return el;
                    });
                    $('inputs-' + cat.id).replaceChildren(...inputs);
                }
                generarDiagrama();
            }
        };
    } else if ($('grafico-pareto')) {
        config = {
            modulo: 'pareto', inicial: {filas: [], umbral: '80'},
            leer: () => ({filas, umbral: $('umbral').value}),
            validar(data) {
                base(data); lista(data.filas, 'causas'); ids(data.filas);
                P.exigir(P.capturaNumero(data.umbral), 'umbral');
                P.exigir(data.filas.every(x => P.texto(x.causa) && P.capturaNumero(x.frecuencia)), 'filas de Pareto');
            },
            aplicar(data) {
                filas.splice(0, filas.length, ...structuredClone(data.filas));
                contador = Math.max(0, ...filas.map(x => x.id));
                $('umbral').value = data.umbral;
                renderizarTabla(); renderizarGrafico();
            }
        };
    } else if ($('lienzo')) {
        config = {
            modulo: 'recorrido', inicial: {estaciones: [], escala: '5'},
            leer: () => ({estaciones, escala: $('escala').value}),
            validar(data) {
                base(data); lista(data.estaciones, 'estaciones'); ids(data.estaciones);
                P.exigir(P.capturaNumero(data.escala), 'escala');
                P.exigir(data.estaciones.every(x => P.texto(x.nombre)
                    && (x.simbolo === null || symbols.includes(x.simbolo))
                    && P.numero(x.x) && x.x >= 0 && x.x <= 900
                    && P.numero(x.y) && x.y >= 0 && x.y <= 600), 'estaciones');
            },
            aplicar(data) {
                estaciones.splice(0, estaciones.length, ...structuredClone(data.estaciones));
                contador = Math.max(0, ...estaciones.map(x => x.id)); arrastrando = null;
                $('escala').value = data.escala;
                renderizarLienzo(); renderizarLista(); renderizarResumen();
            }
        };
    } else if ($('tabla-pasos-body')) {
        const meta = ['producto','ubicacion','actividad','fecha','operador','analista','tipo','maquina','comentarios','color'];
        const initial = structuredClone(estado); initial.actual = []; initial.propuesto = [];
        config = {
            modulo: 'diagrama-flujo', inicial: initial, leer: () => estado,
            validar(data) {
                base(data);
                P.exigir(meta.every(key => P.texto(data[key])), 'datos generales');
                P.exigir(/^#[a-f0-9]{6}$/i.test(data.color), 'color');
                P.exigir(['actual','propuesto'].includes(data.tabActiva), 'método activo');
                P.exigir(['Material','Obrero','Máquina'].includes(data.tipo), 'tipo de diagrama');
                for (const key of ['actual','propuesto']) {
                    lista(data[key], key); ids(data[key]);
                    P.exigir(data[key].every(x => P.texto(x.descripcion) && P.texto(x.metodo)
                        && (x.simbolo === null || symbols.includes(x.simbolo))
                        && P.capturaNumero(x.tiempo) && P.capturaNumero(x.distancia)), 'pasos de ' + key);
                }
            },
            aplicar(data) {
                for (const key of [...meta, 'tabActiva', 'actual', 'propuesto']) estado[key] = structuredClone(data[key]);
                contadorFilas = Math.max(0, ...estado.actual.concat(estado.propuesto).map(x => x.id));
                for (const key of meta) $('meta-' + key).value = estado[key];
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === estado.tabActiva));
                renderizarTabla();
            }
        };
    }
    if (config) P.iniciar(config);
})();
