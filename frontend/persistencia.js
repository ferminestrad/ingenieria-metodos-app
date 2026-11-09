"use strict";

// Un borrador por módulo. Los archivos descargados conservan el formato v1 anterior.
const Persistencia = (() => {
    function iniciar({modulo, inicial, leer, aplicar, validar, migrar = x => x, mensaje}) {
        const key = 'ingenieria.estudio.v1.' + modulo;
        const status = document.getElementById('persistencia-estado');
        const avisar = (texto, error = false) => {
            if (status) { status.textContent = texto; status.classList.toggle('error', error); }
            else if (mensaje) mensaje(texto, error);
        };
        const preparar = data => {
            const next = migrar(structuredClone(data));
            validar(next);
            return next;
        };
        let timer, ultimo = JSON.stringify(leer());
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                aplicar(preparar(JSON.parse(raw)), true);
                ultimo = JSON.stringify(leer());
                avisar('Borrador recuperado de este navegador.');
            }
        } catch {
            avisar('No se pudo recuperar el borrador. No se reemplazará hasta que edites o cargues un estudio.', true);
        }

        function guardar(forzar = false) {
            clearTimeout(timer);
            const raw = JSON.stringify(leer());
            if (!forzar && raw === ultimo) return true;
            try {
                localStorage.setItem(key, raw);
                ultimo = raw;
                avisar('Borrador guardado en este navegador.');
                return true;
            } catch {
                avisar('No se pudo guardar el borrador: descarga el estudio para conservarlo.', true);
                return false;
            }
        }
        function cambiado() {
            if (JSON.stringify(leer()) === ultimo) return;
            clearTimeout(timer);
            avisar('Guardando borrador…');
            timer = setTimeout(() => guardar(), 200);
        }
        function reemplazar(data) {
            const next = preparar(data); // Validación completa antes de tocar el estudio abierto.
            aplicar(next, false);
            guardar(true);
        }
        async function descargar() {
            guardar(true);
            const datos = leer();
            const nombre = (datos.titulo || datos.producto || datos.problema || 'estudio')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 70);
            const blob = new Blob([JSON.stringify({version: 1, modulo, datos}, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${modulo === 'operador-maquina' ? 'hombre-maquina' : modulo}-${nombre}.json`;
            document.body.append(link);
            link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        document.getElementById('guardar').onclick = descargar;
        document.getElementById('cargar').onclick = () => document.getElementById('archivo-estudio').click();
        document.getElementById('archivo-estudio').onchange = async e => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                if (file.size > 64 * 1024 * 1024) throw new Error('El archivo supera 64 MB.');
                const pack = JSON.parse(await file.text());
                if (pack.version !== 1 || pack.modulo !== modulo) throw new Error('El archivo pertenece a otro módulo o versión.');
                const next = preparar(pack.datos);
                if (confirm('¿Cargar este estudio y reemplazar el borrador actual?')) {
                    reemplazar(next);
                    avisar('Estudio cargado.');
                    if (mensaje) mensaje('Estudio cargado. Recalcula para actualizar resultados.');
                }
            } catch (error) {
                avisar(error.message, true);
                if (mensaje) mensaje(error.message, true);
            } finally { e.target.value = ''; }
        };
        document.getElementById('nuevo').onclick = () => {
            if (confirm('¿Iniciar un estudio nuevo? Guarda un archivo del actual si deseas conservarlo.')) reemplazar(inicial);
        };

        // Captura antes de posibles stopPropagation; lee después de los manejadores de la pantalla.
        for (const evento of ['input', 'change', 'click', 'pointerup']) {
            document.addEventListener(evento, () => queueMicrotask(cambiado), true);
        }
        window.addEventListener('pagehide', () => guardar());
        window.addEventListener('beforeunload', () => guardar());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') guardar();
        });
        return {guardar, cambiado, reemplazar};
    }

    const objeto = x => x !== null && typeof x === 'object' && !Array.isArray(x);
    const exigir = (condicion, campo) => { if (!condicion) throw new Error(`Datos inválidos en ${campo}.`); };
    const texto = x => typeof x === 'string' && x.length <= 10000;
    const numero = x => typeof x === 'number' && Number.isFinite(x);
    const capturaNumero = x => (typeof x === 'string' && (x === '' || (x.length < 40 && Number.isFinite(Number(x))))) || numero(x);
    return {iniciar, objeto, exigir, texto, numero, capturaNumero};
})();
