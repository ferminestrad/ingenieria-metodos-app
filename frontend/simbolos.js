/* =====================================================
   SÍMBOLOS ASME / Niebel — metadata compartida
   (usado por diagrama-flujo.js para la UI y por
   pdf-diagrama.js para el dibujo vectorial en el PDF)
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


/* Fragmento de <path>/<circle>/etc. en un viewBox 0 0 40 40,
   usado por los botones e íconos SVG de la interfaz web. */

function pathSimbolo(tipo) {

    switch (tipo) {

        case "operacion":
            return '<circle cx="20" cy="20" r="14"/>';

        case "transporte":
            return '<path d="M5,15 H22 V8 L35,20 L22,32 V25 H5 Z"/>';

        case "inspeccion":
            return '<rect x="7" y="7" width="26" height="26"/>';

        case "demora":
            return '<path d="M8,7 H19 A13,13 0 0 1 19,33 H8 Z"/>';

        case "almacen":
            return '<polygon points="20,32 6,10 34,10"/>';

        default:
            return "";

    }

}
