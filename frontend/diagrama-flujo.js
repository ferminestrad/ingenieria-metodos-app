/* Metadata de símbolos: ver simbolos.js (SIMBOLOS, ORDEN_SIMBOLOS, pathSimbolo) */


/* =====================================================
   ESTADO CENTRALIZADO
   (fuente única de verdad: tabla web, cálculos, resumen,
   comparación y generación del PDF leen de aquí)
   ===================================================== */

let contadorFilas = 0;

const estado = {
    tabActiva: "actual",
    color: "#8a8a8a",

    // Datos generales del estudio
    producto: "",
    ubicacion: "",
    actividad: "",
    fecha: "",
    operador: "",
    analista: "",
    tipo: "Material",
    maquina: "",
    comentarios: "",

    // Filas de cada método (fuente única para tabla/resumen/PDF)
    actual: [],
    propuesto: [],
};


function crearBotonSimbolo(tipo, filaState) {

    const boton =
        document.createElement("button");

    boton.type = "button";
    boton.className = "simbolo-btn";
    boton.title = SIMBOLOS[tipo].etiqueta;

    boton.innerHTML = `
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#222" stroke-width="2" fill="${
                filaState.simbolo === tipo ? estado.color : "white"
            }">
                ${pathSimbolo(tipo)}
            </g>
        </svg>
    `;

    boton.addEventListener("click", () => {

        filaState.simbolo =
            filaState.simbolo === tipo ? null : tipo;

        renderizarTabla();

    });

    return boton;

}


/* =====================================================
   DATOS DE LA PESTAÑA ACTIVA
   ===================================================== */

function filasActuales() {

    return estado[estado.tabActiva];

}


/* =====================================================
   CREAR FILA (estado interno, no DOM)
   ===================================================== */

function numero(valor) {

    const n = parseFloat(valor);

    if (Number.isNaN(n) || n < 0) return 0;

    return n;

}


function nuevaFila() {

    contadorFilas += 1;

    return {
        id: contadorFilas,
        descripcion: "",
        simbolo: null,
        tiempo: "",
        distancia: "",
        metodo: "",
    };

}


/* =====================================================
   RENDER: TABLA
   ===================================================== */

function renderizarTabla() {

    const cuerpo =
        document.getElementById("tabla-pasos-body");

    cuerpo.innerHTML = "";

    const filas = filasActuales();

    filas.forEach((filaState, indice) => {

        const tr =
            document.createElement("tr");


        /* # */

        const tdNum =
            document.createElement("td");

        tdNum.textContent = indice + 1;
        tdNum.className = "col-num";

        tr.appendChild(tdNum);


        /* Descripción */

        const tdDesc =
            document.createElement("td");

        const inputDesc =
            document.createElement("input");

        inputDesc.type = "text";
        inputDesc.placeholder = "Describe el paso";
        inputDesc.value = filaState.descripcion;

        inputDesc.addEventListener("input", () => {

            filaState.descripcion = inputDesc.value;

        });

        tdDesc.appendChild(inputDesc);
        tr.appendChild(tdDesc);


        /* Símbolo */

        const tdSimbolo =
            document.createElement("td");

        const selector =
            document.createElement("div");

        selector.className = "simbolos-selector";

        ORDEN_SIMBOLOS.forEach((tipo) => {

            selector.appendChild(
                crearBotonSimbolo(tipo, filaState)
            );

        });

        tdSimbolo.appendChild(selector);
        tr.appendChild(tdSimbolo);


        /* Tipo (derivado del símbolo) */

        const tdTipo =
            document.createElement("td");

        tdTipo.className = "col-tipo";

        tdTipo.textContent =
            filaState.simbolo
                ? SIMBOLOS[filaState.simbolo].etiqueta
                : "—";

        tr.appendChild(tdTipo);


        /* Tiempo */

        const tdTiempo =
            document.createElement("td");

        const inputTiempo =
            document.createElement("input");

        inputTiempo.type = "number";
        inputTiempo.step = "0.01";
        inputTiempo.min = "0";
        inputTiempo.value = filaState.tiempo;

        inputTiempo.addEventListener("input", () => {

            filaState.tiempo = inputTiempo.value;

            renderizarResumen();

        });

        tdTiempo.appendChild(inputTiempo);
        tr.appendChild(tdTiempo);


        /* Distancia */

        const tdDistancia =
            document.createElement("td");

        const inputDistancia =
            document.createElement("input");

        inputDistancia.type = "number";
        inputDistancia.step = "0.01";
        inputDistancia.min = "0";
        inputDistancia.value = filaState.distancia;

        inputDistancia.addEventListener("input", () => {

            filaState.distancia = inputDistancia.value;

            renderizarResumen();

        });

        tdDistancia.appendChild(inputDistancia);
        tr.appendChild(tdDistancia);


        /* Método recomendado */

        const tdMetodo =
            document.createElement("td");

        const inputMetodo =
            document.createElement("input");

        inputMetodo.type = "text";
        inputMetodo.placeholder = "Opcional";
        inputMetodo.value = filaState.metodo;

        inputMetodo.addEventListener("input", () => {

            filaState.metodo = inputMetodo.value;

        });

        tdMetodo.appendChild(inputMetodo);
        tr.appendChild(tdMetodo);


        /* Acciones */

        const tdAcciones =
            document.createElement("td");

        const contenedorAcciones =
            document.createElement("div");

        contenedorAcciones.className = "fila-acciones";

        const btnSubir =
            document.createElement("button");

        btnSubir.type = "button";
        btnSubir.textContent = "↑";
        btnSubir.title = "Mover arriba";

        btnSubir.addEventListener("click", () => {

            if (indice === 0) return;

            [filas[indice - 1], filas[indice]] =
                [filas[indice], filas[indice - 1]];

            renderizarTabla();

        });

        const btnBajar =
            document.createElement("button");

        btnBajar.type = "button";
        btnBajar.textContent = "↓";
        btnBajar.title = "Mover abajo";

        btnBajar.addEventListener("click", () => {

            if (indice === filas.length - 1) return;

            [filas[indice + 1], filas[indice]] =
                [filas[indice], filas[indice + 1]];

            renderizarTabla();

        });

        const btnEliminar =
            document.createElement("button");

        btnEliminar.type = "button";
        btnEliminar.className = "btn-eliminar";
        btnEliminar.textContent = "✕";
        btnEliminar.title = "Eliminar paso";

        btnEliminar.addEventListener("click", () => {

            filas.splice(indice, 1);

            renderizarTabla();
            renderizarResumen();

        });

        contenedorAcciones.appendChild(btnSubir);
        contenedorAcciones.appendChild(btnBajar);
        contenedorAcciones.appendChild(btnEliminar);

        tdAcciones.appendChild(contenedorAcciones);
        tr.appendChild(tdAcciones);


        cuerpo.appendChild(tr);

    });

    renderizarResumen();

}


/* =====================================================
   CALCULAR RESUMEN DE UN CONJUNTO DE FILAS
   ===================================================== */

function calcularResumen(filas) {

    const conteos = {};

    ORDEN_SIMBOLOS.forEach((tipo) => {
        conteos[tipo] = 0;
    });

    let tiempoTotal = 0;
    let distanciaTotal = 0;

    filas.forEach((fila) => {

        if (fila.simbolo) {

            conteos[fila.simbolo] += 1;

        }

        const tiempo = numero(fila.tiempo);
        const distancia = numero(fila.distancia);

        tiempoTotal += tiempo;
        distanciaTotal += distancia;

    });

    return {
        conteos,
        tiempoTotal,
        distanciaTotal,
        pasos: filas.length,
    };

}


/* =====================================================
   RENDER: RESUMEN
   ===================================================== */

function renderizarResumen() {

    const resumen =
        calcularResumen(filasActuales());

    const grid =
        document.getElementById("resumen-grid");

    grid.innerHTML = "";

    ORDEN_SIMBOLOS.forEach((tipo) => {

        const item =
            document.createElement("div");

        item.className = "resumen-item";

        item.innerHTML = `
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#222" stroke-width="2" fill="${estado.color}">
                    ${pathSimbolo(tipo)}
                </g>
            </svg>
            <span>
                <span class="valor">${resumen.conteos[tipo]}</span>
                <span class="etiqueta">${SIMBOLOS[tipo].etiqueta}</span>
            </span>
        `;

        grid.appendChild(item);

    });

    const totales =
        document.getElementById("resumen-totales");

    totales.innerHTML = `
        <div class="resumen-total">
            <strong>${resumen.pasos}</strong>
            pasos totales
        </div>
        <div class="resumen-total">
            <strong>${resumen.tiempoTotal.toFixed(2)} min</strong>
            tiempo total
        </div>
        <div class="resumen-total">
            <strong>${resumen.distanciaTotal.toFixed(2)} m</strong>
            distancia total
        </div>
    `;

    renderizarComparacion();

}


/* =====================================================
   RENDER: COMPARACIÓN ACTUAL VS PROPUESTO
   ===================================================== */

function tieneContenido(filas) {

    return filas.some(
        (fila) =>
            fila.simbolo !== null ||
            (fila.descripcion || "").trim() !== ""
    );

}


function renderizarComparacion() {

    const seccion =
        document.getElementById("comparacion");

    if (
        !tieneContenido(estado.actual) ||
        !tieneContenido(estado.propuesto)
    ) {

        seccion.classList.add("hidden");

        return;

    }

    seccion.classList.remove("hidden");

    const resumenActual =
        calcularResumen(estado.actual);

    const resumenPropuesto =
        calcularResumen(estado.propuesto);

    const filas = [
        {
            etiqueta: "Pasos totales",
            actual: resumenActual.pasos,
            propuesto: resumenPropuesto.pasos,
            unidad: "",
            decimales: 0,
        },
        {
            etiqueta: "Tiempo total",
            actual: resumenActual.tiempoTotal,
            propuesto: resumenPropuesto.tiempoTotal,
            unidad: " min",
            decimales: 2,
        },
        {
            etiqueta: "Distancia total",
            actual: resumenActual.distanciaTotal,
            propuesto: resumenPropuesto.distanciaTotal,
            unidad: " m",
            decimales: 2,
        },
    ];

    const grid =
        document.getElementById("comparacion-grid");

    grid.innerHTML = "";

    filas.forEach((fila) => {

        const diferencia =
            fila.actual - fila.propuesto;

        let clase = "neutro";
        let signo = "";

        if (diferencia > 0) {
            clase = "positivo";
            signo = "-";
        } else if (diferencia < 0) {
            clase = "negativo";
            signo = "+";
        }

        const item =
            document.createElement("div");

        item.className = "comparacion-item";

        item.innerHTML = `
            <span class="etiqueta">${fila.etiqueta}</span>
            <div class="valores">
                <span>${fila.actual.toFixed(fila.decimales)}${fila.unidad} → ${fila.propuesto.toFixed(fila.decimales)}${fila.unidad}</span>
            </div>
            <div class="ahorro ${clase}">
                ${signo}${Math.abs(diferencia).toFixed(fila.decimales)}${fila.unidad}
            </div>
        `;

        grid.appendChild(item);

    });

}


/* =====================================================
   PESTAÑAS
   ===================================================== */

function inicializarPestañas() {

    document.querySelectorAll(".tab-btn").forEach((boton) => {

        boton.addEventListener("click", () => {

            document.querySelectorAll(".tab-btn").forEach(
                (b) => b.classList.remove("active")
            );

            boton.classList.add("active");

            estado.tabActiva = boton.dataset.tab;

            renderizarTabla();

        });

    });

}


/* =====================================================
   SINCRONIZAR "DATOS GENERALES" AL ESTADO
   ===================================================== */

function conectarCampoMeta(idCampo, clave) {

    const el =
        document.getElementById(idCampo);

    if (!el) return;

    el.addEventListener("input", () => {

        estado[clave] = el.value;

    });

}


/* =====================================================
   INICIALIZACIÓN
   ===================================================== */

function iniciar() {

    document
        .getElementById("meta-color")
        .addEventListener("input", (evento) => {

            estado.color = evento.target.value;

            renderizarTabla();

        });

    conectarCampoMeta("meta-producto", "producto");
    conectarCampoMeta("meta-ubicacion", "ubicacion");
    conectarCampoMeta("meta-actividad", "actividad");
    conectarCampoMeta("meta-fecha", "fecha");
    conectarCampoMeta("meta-operador", "operador");
    conectarCampoMeta("meta-analista", "analista");
    conectarCampoMeta("meta-tipo", "tipo");
    conectarCampoMeta("meta-maquina", "maquina");
    conectarCampoMeta("meta-comentarios", "comentarios");

    document
        .getElementById("agregar-paso")
        .addEventListener("click", () => {

            filasActuales().push(nuevaFila());

            renderizarTabla();

        });

    document
        .getElementById("vista-previa")
        .addEventListener("click", () => {

            mostrarVistaPrevia(estado);

        });

    document
        .getElementById("generar-pdf")
        .addEventListener("click", () => {

            descargarPDF(estado);

        });

    inicializarPestañas();

    // 3 filas iniciales en cada tabla
    for (let i = 0; i < 3; i++) {

        estado.actual.push(nuevaFila());
        estado.propuesto.push(nuevaFila());

    }

    renderizarTabla();

}

iniciar();
