const svg = document.getElementById("ishikawa");
const botonGenerar = document.getElementById("generar-diagrama");
const SVG_NS = "http://www.w3.org/2000/svg";

const CATEGORIAS = [
    { nombre: "Mano de obra", id: "mano-obra", columna: 0, arriba: true },
    { nombre: "Maquinaria", id: "maquinaria", columna: 1, arriba: true },
    { nombre: "Método", id: "metodos", columna: 2, arriba: true },
    { nombre: "Materiales", id: "materiales", columna: 0, arriba: false },
    { nombre: "Medición", id: "medicion", columna: 1, arriba: false },
    { nombre: "Medio ambiente", id: "medio-ambiente", columna: 2, arriba: false }
];

const DISENO = {
    margen: 36,
    anchoColumna: 350,
    anchoTexto: 224,
    fuenteCausa: 16,
    interlineado: 22,
    espacioCausas: 24,
    margenSuperior: 76,
    margenInferior: 76,
    anchoCabeza: 380,
    anchoProblema: 206
};

const contextoMedicion = document.createElement("canvas").getContext("2d");

document.querySelectorAll(".add-cause").forEach((boton) => {
    boton.addEventListener("click", () => {
        const categoria = boton.dataset.category;
        const contenedor = document.getElementById(`inputs-${categoria}`);
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cause-input";
        input.placeholder = "Escribe una causa";
        input.setAttribute("aria-label", `Causa de ${CATEGORIAS.find(c => c.id === categoria).nombre}`);
        contenedor.appendChild(input);
        input.focus();
    });
});

function obtenerCausas(categoria) {
    return Array.from(document.querySelectorAll(`#inputs-${categoria} .cause-input`))
        .map(input => input.value.trim())
        .filter(Boolean);
}

function crearElementoSVG(tipo, atributos = {}) {
    const elemento = document.createElementNS(SVG_NS, tipo);
    Object.entries(atributos).forEach(([nombre, valor]) => {
        elemento.setAttribute(nombre, valor);
    });
    return elemento;
}

function crearLinea(x1, y1, x2, y2, grosor = 2) {
    return crearElementoSVG("line", {
        x1, y1, x2, y2,
        stroke: "#30343b",
        "stroke-width": grosor,
        "stroke-linecap": "round"
    });
}

function crearTexto(texto, x, y, tamano = 16, ancla = "start", peso = 400) {
    const elemento = crearElementoSVG("text", {
        x, y,
        "font-size": tamano,
        "font-family": "Arial, sans-serif",
        "font-weight": peso,
        "text-anchor": ancla,
        fill: "#20242a"
    });
    elemento.textContent = texto;
    return elemento;
}

// Medir antes de distribuir evita depender de la cantidad de caracteres.
// Las palabras sin espacios también se dividen para no invadir otra rama.
function dividirTexto(texto, ancho, tamano = 16) {
    if (contextoMedicion) contextoMedicion.font = `${tamano}px Arial`;
    const medir = valor => contextoMedicion
        ? contextoMedicion.measureText(valor).width
        : Array.from(valor).length * tamano;
    const palabras = texto.trim().split(/\s+/u).filter(Boolean);
    const lineas = [];
    let actual = "";

    palabras.forEach((palabra) => {
        const propuesta = actual ? `${actual} ${palabra}` : palabra;
        if (medir(propuesta) <= ancho) {
            actual = propuesta;
            return;
        }
        if (actual) lineas.push(actual);
        actual = "";
        Array.from(palabra).forEach((caracter) => {
            if (actual && medir(actual + caracter) > ancho) {
                lineas.push(actual);
                actual = "";
            }
            actual += caracter;
        });
    });
    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [""];
}

function prepararCategorias() {
    return CATEGORIAS.map(categoria => {
        const causas = obtenerCausas(categoria.id).map(texto => {
            const lineas = dividirTexto(texto, DISENO.anchoTexto, DISENO.fuenteCausa);
            return {
                texto,
                lineas,
                alto: lineas.length * DISENO.interlineado + DISENO.espacioCausas
            };
        });
        return {
            ...categoria,
            causas,
            alto: causas.reduce((total, causa) => total + causa.alto, 0)
        };
    });
}

function dibujarCausas(grupo, categoria, izquierda, yCentro, yExtremo) {
    const xBase = izquierda + 326;
    const xExtremo = izquierda + 250;
    // Las etiquetas quedan a la izquierda de su espina principal.
    // Cada bloque reserva su propio alto, incluida la línea horizontal.
    let yTexto = (categoria.arriba ? yExtremo : yCentro) + 36;

    categoria.causas.forEach(causa => {
        const bloque = crearElementoSVG("g", { "data-causa": "" });
        causa.lineas.forEach((linea, indice) => {
            bloque.appendChild(crearTexto(
                linea,
                izquierda + 10,
                yTexto + indice * DISENO.interlineado,
                DISENO.fuenteCausa
            ));
        });
        const yLinea = yTexto + (causa.lineas.length - 1) * DISENO.interlineado + 9;
        const proporcion = (yLinea - yCentro) / (yExtremo - yCentro);
        const xUnion = xBase + (xExtremo - xBase) * proporcion;
        bloque.appendChild(crearLinea(izquierda + 8, yLinea, xUnion, yLinea, 1.4));
        grupo.appendChild(bloque);
        yTexto += causa.alto;
    });
}

function dibujarCabeza(x, yCentro, semialto, lineasProblema) {
    const grupo = crearElementoSVG("g", { "data-cabeza": "" });
    grupo.appendChild(crearElementoSVG("polygon", {
        points: `${x},${yCentro - semialto} ${x + DISENO.anchoCabeza},${yCentro} ${x},${yCentro + semialto}`,
        fill: "#f3f6f8",
        stroke: "#30343b",
        "stroke-width": 2.5,
        "stroke-linejoin": "round"
    }));

    const altoTexto = 28 + lineasProblema.length * DISENO.interlineado;
    const inicio = yCentro - altoTexto / 2;
    const titulo = crearTexto("EFECTO", x + 24, inicio + 14, 12, "start", 700);
    titulo.setAttribute("fill", "#58616d");
    grupo.appendChild(titulo);
    lineasProblema.forEach((linea, indice) => {
        grupo.appendChild(crearTexto(linea, x + 24, inicio + 40 + indice * DISENO.interlineado));
    });

    // Un ojo pequeño conserva la cabeza triangular y refuerza la forma de pez.
    grupo.appendChild(crearElementoSVG("circle", {
        cx: x + DISENO.anchoCabeza * 0.82,
        cy: yCentro - semialto * 0.035,
        r: 4,
        fill: "#30343b"
    }));
    svg.appendChild(grupo);
}

function generarDiagrama() {
    const problema = document.getElementById("problema").value.trim() || "Problema / Efecto";
    const categorias = prepararCategorias();
    const lineasProblema = dividirTexto(problema, DISENO.anchoProblema);
    const altoProblema = 28 + lineasProblema.length * DISENO.interlineado;

    // El texto ocupa un rectángulo inscrito en el triángulo, no su caja exterior.
    // El semialto aumenta si el efecto necesita más líneas; no se trunca texto.
    const fraccionDisponible = 1 - (24 + DISENO.anchoProblema) / DISENO.anchoCabeza;
    const semialtoCabeza = Math.max(112, (altoProblema / 2 + 22) / fraccionDisponible);
    const altoLado = arriba => Math.max(
        190,
        semialtoCabeza + 20,
        ...categorias.filter(c => c.arriba === arriba).map(c => c.alto + 66)
    );
    const altoSuperior = altoLado(true);
    const altoInferior = altoLado(false);
    const ySuperior = DISENO.margenSuperior;
    const yCentro = ySuperior + altoSuperior;
    const yInferior = yCentro + altoInferior;
    const xCabeza = DISENO.margen + DISENO.anchoColumna * 3 + 24;
    const ancho = xCabeza + DISENO.anchoCabeza + DISENO.margen;
    const alto = Math.ceil(yInferior + DISENO.margenInferior);

    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.setAttribute("width", ancho);
    svg.setAttribute("height", alto);
    const titulo = crearElementoSVG("title", { id: "titulo-ishikawa" });
    titulo.textContent = `Diagrama de Ishikawa de las 6 M: ${problema}`;
    svg.appendChild(titulo);
    svg.appendChild(crearElementoSVG("rect", { width: ancho, height: alto, fill: "#ffffff" }));
    svg.appendChild(crearLinea(DISENO.margen, yCentro, xCabeza, yCentro, 3));

    categorias.forEach(categoria => {
        const izquierda = DISENO.margen + categoria.columna * DISENO.anchoColumna;
        const yExtremo = categoria.arriba ? ySuperior : yInferior;
        const grupo = crearElementoSVG("g", { "data-categoria": categoria.id });
        grupo.appendChild(crearLinea(izquierda + 326, yCentro, izquierda + 250, yExtremo, 2.5));
        grupo.appendChild(crearTexto(
            categoria.nombre,
            izquierda + 232,
            yExtremo + (categoria.arriba ? -24 : 38),
            18,
            "middle",
            700
        ));
        dibujarCausas(grupo, categoria, izquierda, yCentro, yExtremo);
        svg.appendChild(grupo);
    });
    dibujarCabeza(xCabeza, yCentro, semialtoCabeza, lineasProblema);
}

botonGenerar.addEventListener("click", generarDiagrama);
generarDiagrama();
