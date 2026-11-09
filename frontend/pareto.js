/* =====================================================
   ESTADO
   ===================================================== */

let contador = 0;

const filas = [];

const ejemplos = [
    ["Piezas rayadas", 45],
    ["Medidas fuera de tolerancia", 28],
    ["Empaque dañado", 15],
    ["Etiqueta incorrecta", 8],
    ["Color no uniforme", 4],
];


/* =====================================================
   CREAR FILA
   ===================================================== */

function nuevaFila(causa = "", frecuencia = "") {

    contador += 1;

    return { id: contador, causa, frecuencia };

}


/* =====================================================
   RENDER: TABLA
   ===================================================== */

function renderizarTabla() {

    const cuerpo =
        document.getElementById("tabla-pareto-body");

    cuerpo.innerHTML = "";

    filas.forEach((fila) => {

        const tr =
            document.createElement("tr");


        const tdCausa =
            document.createElement("td");

        const inputCausa =
            document.createElement("input");

        inputCausa.type = "text";
        inputCausa.placeholder = "Ej. Piezas rayadas";
        inputCausa.value = fila.causa;

        inputCausa.addEventListener("input", () => {

            fila.causa = inputCausa.value;

            renderizarGrafico();

        });

        tdCausa.appendChild(inputCausa);
        tr.appendChild(tdCausa);


        const tdFrecuencia =
            document.createElement("td");

        const inputFrecuencia =
            document.createElement("input");

        inputFrecuencia.type = "number";
        inputFrecuencia.min = "0";
        inputFrecuencia.step = "1";
        inputFrecuencia.value = fila.frecuencia;

        inputFrecuencia.addEventListener("input", () => {

            fila.frecuencia = inputFrecuencia.value;

            renderizarGrafico();

        });

        tdFrecuencia.appendChild(inputFrecuencia);
        tr.appendChild(tdFrecuencia);


        const tdAcciones =
            document.createElement("td");

        const btnEliminar =
            document.createElement("button");

        btnEliminar.type = "button";
        btnEliminar.className = "btn-eliminar";
        btnEliminar.textContent = "✕";
        btnEliminar.title = "Eliminar";

        btnEliminar.addEventListener("click", () => {

            const indice = filas.indexOf(fila);

            filas.splice(indice, 1);

            renderizarTabla();
            renderizarGrafico();

        });

        tdAcciones.appendChild(btnEliminar);
        tr.appendChild(tdAcciones);


        cuerpo.appendChild(tr);

    });

}


/* =====================================================
   CÁLCULO DE PARETO
   ===================================================== */

function calcularPareto() {

    const datos = filas
        .map((f) => ({
            causa: (f.causa || "").trim() || "(sin nombre)",
            frecuencia: parseFloat(f.frecuencia),
        }))
        .filter((d) => !Number.isNaN(d.frecuencia) && d.frecuencia > 0);

    datos.sort((a, b) => b.frecuencia - a.frecuencia);

    const total =
        datos.reduce((suma, d) => suma + d.frecuencia, 0);

    let acumulado = 0;

    datos.forEach((d) => {

        acumulado += d.frecuencia;

        d.acumulado = acumulado;
        d.porcentaje = total > 0 ? (d.frecuencia / total) * 100 : 0;
        d.porcentajeAcumulado = total > 0 ? (acumulado / total) * 100 : 0;

    });

    return { datos, total };

}


/* =====================================================
   RENDER: GRÁFICO SVG
   ===================================================== */

function crearElementoSVG(tag, atributos) {

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


function renderizarGrafico() {

    const svg =
        document.getElementById("grafico-pareto");

    svg.innerHTML = "";

    const { datos, total } = calcularPareto();

    const conclusion =
        document.getElementById("pareto-conclusion");

    if (datos.length === 0) {

        conclusion.textContent =
            "Agrega causas con una frecuencia mayor a 0 para ver el diagrama.";

        return;

    }

    const umbral =
        parseFloat(document.getElementById("umbral").value) || 80;


    /* --- Geometría --- */

    const ANCHO = 900;
    const ALTO = 500;

    const margen = { top: 30, right: 60, bottom: 100, left: 60 };

    const anchoPlot = ANCHO - margen.left - margen.right;
    const altoPlot = ALTO - margen.top - margen.bottom;

    const maxFrecuencia =
        Math.max(...datos.map((d) => d.frecuencia)) * 1.15;

    const n = datos.length;
    const anchoBarra = (anchoPlot / n) * 0.6;
    const paso = anchoPlot / n;

    const xCentro = (i) =>
        margen.left + paso * i + paso / 2;

    const yFrecuencia = (valor) =>
        margen.top + altoPlot * (1 - valor / maxFrecuencia);

    const yPorcentaje = (valor) =>
        margen.top + altoPlot * (1 - valor / 100);


    /* --- Encontrar el índice de corte (pocos vitales) --- */

    let indiceCorte = datos.findIndex(
        (d) => d.porcentajeAcumulado >= umbral
    );

    if (indiceCorte === -1) indiceCorte = n - 1;


    /* --- Eje izquierdo (frecuencia) --- */

    const pasosEjeIzq = 5;

    for (let i = 0; i <= pasosEjeIzq; i++) {

        const valor = (maxFrecuencia / pasosEjeIzq) * i;
        const y = yFrecuencia(valor);

        svg.appendChild(
            crearElementoSVG("line", {
                x1: margen.left,
                y1: y,
                x2: ANCHO - margen.right,
                y2: y,
                stroke: "#eee",
                "stroke-width": 1,
            })
        );

        svg.appendChild(
            crearElementoSVG("text", {
                x: margen.left - 10,
                y: y + 4,
                "font-size": 11,
                fill: "#777",
                "text-anchor": "end",
            })
        ).textContent = Math.round(valor);

    }


    /* --- Eje derecho (%) --- */

    [0, 20, 40, 60, 80, 100].forEach((valor) => {

        const y = yPorcentaje(valor);

        svg.appendChild(
            crearElementoSVG("text", {
                x: ANCHO - margen.right + 10,
                y: y + 4,
                "font-size": 11,
                fill: "#777",
            })
        ).textContent = `${valor}%`;

    });


    /* --- Línea de umbral --- */

    const yUmbral = yPorcentaje(umbral);

    svg.appendChild(
        crearElementoSVG("line", {
            x1: margen.left,
            y1: yUmbral,
            x2: ANCHO - margen.right,
            y2: yUmbral,
            stroke: "#b00020",
            "stroke-width": 1.3,
            "stroke-dasharray": "6,4",
        })
    );

    svg.appendChild(
        crearElementoSVG("text", {
            x: ANCHO - margen.right,
            y: yUmbral - 8,
            "font-size": 11.5,
            fill: "#b00020",
            "text-anchor": "end",
            "font-weight": "700",
        })
    ).textContent = `${umbral}%`;


    /* --- Barras --- */

    datos.forEach((d, i) => {

        const x = xCentro(i) - anchoBarra / 2;
        const y = yFrecuencia(d.frecuencia);
        const alto = margen.top + altoPlot - y;

        svg.appendChild(
            crearElementoSVG("rect", {
                x,
                y,
                width: anchoBarra,
                height: alto,
                fill: i <= indiceCorte ? "#111" : "#d0d0d0",
            })
        );

        svg.appendChild(
            crearElementoSVG("text", {
                x: xCentro(i),
                y: y - 8,
                "font-size": 11,
                "text-anchor": "middle",
                fill: "#333",
            })
        ).textContent = d.frecuencia;


        /* Etiqueta de categoría (rotada) */

        const etiqueta =
            crearElementoSVG("text", {
                x: 0,
                y: 0,
                "font-size": 11,
                fill: "#333",
                "text-anchor": "end",
                transform: `translate(${xCentro(i)}, ${margen.top + altoPlot + 14}) rotate(-35)`,
            });

        etiqueta.textContent =
            d.causa.length > 22
                ? d.causa.slice(0, 20) + "…"
                : d.causa;

        svg.appendChild(etiqueta);

    });


    /* --- Línea acumulada --- */

    const puntos = datos.map(
        (d, i) => `${xCentro(i)},${yPorcentaje(d.porcentajeAcumulado)}`
    );

    svg.appendChild(
        crearElementoSVG("polyline", {
            points: puntos.join(" "),
            fill: "none",
            stroke: "#111",
            "stroke-width": 2,
        })
    );

    datos.forEach((d, i) => {

        svg.appendChild(
            crearElementoSVG("circle", {
                cx: xCentro(i),
                cy: yPorcentaje(d.porcentajeAcumulado),
                r: 3.5,
                fill: "#111",
            })
        );

        svg.appendChild(
            crearElementoSVG("text", {
                x: xCentro(i),
                y: yPorcentaje(d.porcentajeAcumulado) - 10,
                "font-size": 11,
                "text-anchor": "middle",
                fill: "#111",
                "font-weight": "600",
            })
        ).textContent = `${d.porcentajeAcumulado.toFixed(0)}%`;

    });


    /* --- Conclusión --- */

    const pocosVitales =
        datos.slice(0, indiceCorte + 1).map((d) => d.causa);

    conclusion.textContent =
        `${pocosVitales.length} de ${n} causas ` +
        `(${pocosVitales.join(", ")}) concentran el ` +
        `${datos[indiceCorte].porcentajeAcumulado.toFixed(1)}% ` +
        `del total (${total} casos).`;

}


/* =====================================================
   INICIALIZACIÓN
   ===================================================== */

function iniciar() {

    ejemplos.forEach(([causa, frecuencia]) => {

        filas.push(nuevaFila(causa, frecuencia));

    });

    renderizarTabla();
    renderizarGrafico();

    document
        .getElementById("agregar-causa")
        .addEventListener("click", () => {

            filas.push(nuevaFila());

            renderizarTabla();
            renderizarGrafico();

        });

    document
        .getElementById("umbral")
        .addEventListener("input", renderizarGrafico);

}

iniciar();
