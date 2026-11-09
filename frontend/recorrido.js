/* =====================================================
   SÍMBOLOS (mismo set que Diagrama de flujo)
   ===================================================== */

const SIMBOLOS = {
    operacion: { etiqueta: "Operación", orden: 1 },
    transporte: { etiqueta: "Transporte", orden: 2 },
    demora: { etiqueta: "Demora", orden: 3 },
    inspeccion: { etiqueta: "Inspección", orden: 4 },
    almacen: { etiqueta: "Almacén", orden: 5 },
};

const ORDEN_SIMBOLOS =
    Object.keys(SIMBOLOS).sort(
        (a, b) => SIMBOLOS[a].orden - SIMBOLOS[b].orden
    );

function pathSimbolo(tipo, r = 14) {

    switch (tipo) {
        case "operacion":
            return `<circle cx="20" cy="20" r="${r}"/>`;
        case "transporte":
            return '<path d="M5,15 H22 V8 L35,20 L22,32 V25 H5 Z"/>';
        case "inspeccion":
            return '<rect x="7" y="7" width="26" height="26"/>';
        case "demora":
            return '<path d="M8,7 H19 A13,13 0 0 1 19,33 H8 Z"/>';
        case "almacen":
            return '<polygon points="20,32 6,10 34,10"/>';
        default:
            return `<circle cx="20" cy="20" r="${r}" stroke-dasharray="3,3"/>`;
    }

}


/* =====================================================
   ESTADO
   ===================================================== */

let contador = 0;
let arrastrando = null;

const estaciones = [];

const lienzo =
    document.getElementById("lienzo");


/* =====================================================
   UTILIDADES
   ===================================================== */

function nuevaEstacion(x, y) {

    contador += 1;

    return {
        id: contador,
        nombre: `Estación ${contador}`,
        simbolo: null,
        x,
        y,
    };

}

function coordsSVG(evento) {

    const punto = lienzo.createSVGPoint();

    punto.x = evento.clientX;
    punto.y = evento.clientY;

    const ctm = lienzo.getScreenCTM().inverse();

    return punto.matrixTransform(ctm);

}

function clamp(valor, min, max) {

    return Math.min(Math.max(valor, min), max);

}

function crearSVG(tag, atributos) {

    const el =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            tag
        );

    Object.entries(atributos).forEach(([clave, valor]) => {

        el.setAttribute(clave, valor);

    });

    return el;

}


/* =====================================================
   RENDER: LIENZO
   ===================================================== */

function renderizarLienzo() {

    lienzo.innerHTML = "";


    /* --- Fondo + rejilla --- */

    const fondo =
        crearSVG("rect", {
            id: "fondo-lienzo",
            x: 0, y: 0, width: 900, height: 600,
            fill: "#fafafa",
        });

    fondo.addEventListener("click", (evento) => {

        if (arrastrando) return;

        const punto = coordsSVG(evento);

        estaciones.push(
            nuevaEstacion(
                clamp(punto.x, 15, 885),
                clamp(punto.y, 15, 585)
            )
        );

        renderizarLienzo();
        renderizarLista();
        renderizarResumen();

    });

    lienzo.appendChild(fondo);

    for (let x = 0; x <= 900; x += 50) {

        lienzo.appendChild(
            crearSVG("line", {
                x1: x, y1: 0, x2: x, y2: 600,
                stroke: "#eee", "stroke-width": 1,
            })
        );

    }

    for (let y = 0; y <= 600; y += 50) {

        lienzo.appendChild(
            crearSVG("line", {
                x1: 0, y1: y, x2: 900, y2: y,
                stroke: "#eee", "stroke-width": 1,
            })
        );

    }


    /* --- Ruta (polyline con flechas) --- */

    if (estaciones.length > 1) {

        const puntos =
            estaciones.map((e) => `${e.x},${e.y}`).join(" ");

        lienzo.appendChild(
            crearSVG("polyline", {
                points: puntos,
                fill: "none",
                stroke: "#111",
                "stroke-width": 2,
                "marker-mid": "url(#flecha)",
                "marker-end": "url(#flecha)",
            })
        );

        const defs =
            crearSVG("defs", {});

        defs.innerHTML = `
            <marker id="flecha" markerWidth="10" markerHeight="10"
                    refX="7" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#111"></path>
            </marker>
        `;

        lienzo.appendChild(defs);

    }


    /* --- Estaciones --- */

    estaciones.forEach((estacion, indice) => {

        const grupo =
            crearSVG("g", { class: "nodo-estacion" });

        grupo.style.cursor = "grab";

        grupo.innerHTML = `
            <g transform="translate(${estacion.x - 20}, ${estacion.y - 20})"
               stroke="#222" stroke-width="2"
               fill="${estacion.simbolo ? "#111" : "white"}">
                ${pathSimbolo(estacion.simbolo)}
            </g>
            <text x="${estacion.x}" y="${estacion.y - 26}"
                  font-size="12" font-weight="700" text-anchor="middle"
                  fill="#111">${indice + 1}</text>
            <text x="${estacion.x}" y="${estacion.y + 38}"
                  font-size="11.5" text-anchor="middle"
                  fill="#333">${
                      escaparTexto(estacion.nombre.length > 18
                          ? estacion.nombre.slice(0, 16) + "…"
                          : estacion.nombre)
                  }</text>
        `;

        grupo.addEventListener("pointerdown", (evento) => {

            evento.stopPropagation();

            arrastrando = estacion;

            lienzo.setPointerCapture(evento.pointerId);
            grupo.style.cursor = "grabbing";

        });

        lienzo.appendChild(grupo);

    });

}


/* =====================================================
   RENDER: PANEL LATERAL
   ===================================================== */

function renderizarLista() {

    const contenedor =
        document.getElementById("lista-estaciones");

    const vacio =
        document.getElementById("panel-vacio");

    contenedor.innerHTML = "";

    vacio.style.display =
        estaciones.length === 0 ? "block" : "none";

    estaciones.forEach((estacion, indice) => {

        const item =
            document.createElement("div");

        item.className = "estacion-item";


        const top =
            document.createElement("div");

        top.className = "estacion-item-top";

        const numero =
            document.createElement("span");

        numero.className = "estacion-numero";
        numero.textContent = indice + 1;

        const inputNombre =
            document.createElement("input");

        inputNombre.type = "text";
        inputNombre.value = estacion.nombre;

        inputNombre.addEventListener("input", () => {

            estacion.nombre = inputNombre.value;

            renderizarLienzo();

        });

        const btnEliminar =
            document.createElement("button");

        btnEliminar.className = "estacion-eliminar";
        btnEliminar.textContent = "✕";
        btnEliminar.title = "Eliminar estación";

        btnEliminar.addEventListener("click", () => {

            estaciones.splice(indice, 1);

            renderizarLienzo();
            renderizarLista();
            renderizarResumen();

        });

        top.appendChild(numero);
        top.appendChild(inputNombre);
        top.appendChild(btnEliminar);

        item.appendChild(top);


        const selectorSimbolos =
            document.createElement("div");

        selectorSimbolos.className = "estacion-simbolos";

        ORDEN_SIMBOLOS.forEach((tipo) => {

            const boton =
                document.createElement("button");

            boton.type = "button";
            boton.title = SIMBOLOS[tipo].etiqueta;

            if (estacion.simbolo === tipo) {
                boton.classList.add("activo");
            }

            boton.innerHTML = `
                <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="#222" stroke-width="2.5"
                       fill="${estacion.simbolo === tipo ? "#111" : "white"}">
                        ${pathSimbolo(tipo)}
                    </g>
                </svg>
            `;

            boton.addEventListener("click", () => {

                estacion.simbolo =
                    estacion.simbolo === tipo ? null : tipo;

                renderizarLienzo();
                renderizarLista();

            });

            selectorSimbolos.appendChild(boton);

        });

        item.appendChild(selectorSimbolos);

        contenedor.appendChild(item);

    });

}


/* =====================================================
   RENDER: RESUMEN
   ===================================================== */

function renderizarResumen() {

    const escala =
        parseFloat(document.getElementById("escala").value) || 0;

    let distanciaPx = 0;

    for (let i = 1; i < estaciones.length; i++) {

        const a = estaciones[i - 1];
        const b = estaciones[i];

        distanciaPx += Math.hypot(b.x - a.x, b.y - a.y);

    }

    const distanciaReal =
        distanciaPx * (escala / 100);

    const totales =
        document.getElementById("resumen-totales");

    totales.innerHTML = `
        <div class="resumen-total">
            <strong>${estaciones.length}</strong>
            estaciones
        </div>
        <div class="resumen-total">
            <strong>${distanciaReal.toFixed(2)} m</strong>
            distancia total recorrida
        </div>
    `;

}


/* =====================================================
   INICIALIZACIÓN
   ===================================================== */

function iniciar() {

    lienzo.addEventListener('pointermove', evento => {
        if (!arrastrando) return;
        const punto = coordsSVG(evento);
        arrastrando.x = clamp(punto.x, 15, 885);
        arrastrando.y = clamp(punto.y, 15, 585);
        renderizarLienzo(); renderizarResumen();
    });
    for (const event of ['pointerup', 'pointercancel']) lienzo.addEventListener(event, () => {
        arrastrando = null; renderizarResumen();
    });

    renderizarLienzo();
    renderizarLista();
    renderizarResumen();

    document.addEventListener("pointerup", () => {

        arrastrando = null;

    });

    document
        .getElementById("escala")
        .addEventListener("input", renderizarResumen);

}

iniciar();

function escaparTexto(texto) {
    return texto.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
