/* =====================================================
   pdf-diagrama.js
   Construye el PDF del Diagrama de Flujo de Proceso a partir
   del estado centralizado (estado.actual / estado.propuesto /
   datos generales). Usa jsPDF + jsPDF-AutoTable. Todo el
   dibujo (texto, líneas, símbolos, tabla) es vectorial —
   no hay ninguna captura de pantalla del HTML.
   ===================================================== */

const PDF_MARGEN = 10;
const PDF_ANCHO_UTIL = 297 - PDF_MARGEN * 2; // A4 landscape


/* =====================================================
   UTILIDADES
   ===================================================== */

function pdfNumero(valor) {

    const n = parseFloat(valor);

    return Number.isNaN(n) || n < 0 ? 0 : n;

}

function pdfSlug(texto) {

    return (texto || "proceso")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "proceso";

}

function pdfTexto(doc, texto, x, y, opciones) {

    doc.text(texto === "" || texto === null || texto === undefined ? "-" : String(texto), x, y, opciones);

}


/* =====================================================
   DIBUJO VECTORIAL DE SÍMBOLOS (para celdas de la tabla)
   ===================================================== */

function dibujarSimboloPDF(doc, tipo, cx, cy, r) {

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.35);

    switch (tipo) {

        case "operacion":
            doc.circle(cx, cy, r, "S");
            break;

        case "inspeccion":
            doc.rect(cx - r, cy - r, r * 2, r * 2, "S");
            break;

        case "almacen":
            doc.triangle(
                cx - r, cy + r * 0.6,
                cx + r, cy + r * 0.6,
                cx, cy - r * 0.8,
                "S"
            );
            break;

        case "transporte":
            doc.line(cx - r, cy, cx + r * 0.35, cy);
            doc.setFillColor(20, 20, 20);
            doc.triangle(
                cx + r * 0.35, cy - r * 0.55,
                cx + r * 0.35, cy + r * 0.55,
                cx + r * 1.05, cy,
                "F"
            );
            break;

        case "demora":
            doc.setFont("helvetica", "bold");
            doc.setFontSize(r * 5.2);
            doc.text("D", cx, cy + r * 0.35, { align: "center" });
            doc.setFont("helvetica", "normal");
            break;

        default:
            break;

    }

}


/* =====================================================
   ENCABEZADO DE SECCIÓN (título, datos generales, resúmenes)
   Devuelve la coordenada Y donde debe iniciar la tabla.
   ===================================================== */

function dibujarEncabezadoSeccion(doc, datos, metodo) {

    const x0 = PDF_MARGEN;
    const anchoUtil = PDF_ANCHO_UTIL;
    const centroX = 297 / 2;

    let y = PDF_MARGEN;


    /* --- Título --- */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    const producto = datos.producto && datos.producto.trim() !== ""
        ? datos.producto.trim()
        : "________________";

    doc.text(
        `Diagrama de Flujo del proceso (${datos.tipo || "Material"}) para la producción de ${producto}`,
        centroX, y + 5, { align: "center" }
    );

    y += 9;

    doc.setFontSize(11);

    const etiquetaMetodo =
        metodo === "actual" ? "ACTUAL" : "PROPUESTO";

    doc.text(`Método: ${etiquetaMetodo}`, centroX, y + 4, { align: "center" });

    y += 9;


    /* --- Datos generales (grid 4 x 2) --- */

    const altoFilaDatos = 7;
    const altoDatos = altoFilaDatos * 2;

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.25);
    doc.rect(x0, y, anchoUtil, altoDatos, "S");

    const colDatos = anchoUtil / 4;

    for (let i = 1; i < 4; i++) {

        doc.line(x0 + colDatos * i, y, x0 + colDatos * i, y + altoDatos);

    }

    doc.line(x0, y + altoFilaDatos, x0 + anchoUtil, y + altoFilaDatos);

    const camposDatos = [
        ["Ubicación", datos.ubicacion],
        ["Actividad", datos.actividad],
        ["Fecha", datos.fecha],
        ["Operador", datos.operador],
        ["Analista", datos.analista],
        ["Tipo", datos.tipo],
        ["Máquina", datos.maquina],
        ["", ""],
    ];

    doc.setFontSize(8.5);

    camposDatos.forEach((campo, indice) => {

        if (!campo[0]) return;

        const fila = Math.floor(indice / 4);
        const col = indice % 4;

        const cx = x0 + col * colDatos + 2.5;
        const cy = y + fila * altoFilaDatos + altoFilaDatos / 2 + 1.2;

        doc.setFont("helvetica", "bold");
        doc.text(`${campo[0]}:`, cx, cy);

        const anchoLabel = doc.getTextWidth(`${campo[0]}: `);

        doc.setFont("helvetica", "normal");

        const valor = campo[1] && String(campo[1]).trim() !== "" ? String(campo[1]) : "-";
        const valorCorto = doc.splitTextToSize(valor, colDatos - anchoLabel - 5)[0] || "-";

        doc.text(valorCorto, cx + anchoLabel, cy);

    });

    y += altoDatos + 4;


    /* --- Comentarios --- */

    const altoComentarios = 10;

    doc.setDrawColor(120, 120, 120);
    doc.rect(x0, y, anchoUtil, altoComentarios, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Comentarios:", x0 + 2.5, y + 4.2);

    doc.setFont("helvetica", "normal");

    const comentarios = datos.comentarios && datos.comentarios.trim() !== ""
        ? datos.comentarios.trim()
        : "-";

    const lineasComentarios =
        doc.splitTextToSize(comentarios, anchoUtil - 30).slice(0, 2);

    doc.text(lineasComentarios, x0 + 28, y + 4.2);

    y += altoComentarios + 4;


    /* --- Resúmenes (Actual | Propuesto) lado a lado --- */

    const anchoResumen = (anchoUtil - 4) / 2;
    const altoResumen = 34;

    const resumenActual = calcularResumen(datos.actual);
    const resumenPropuesto = calcularResumen(datos.propuesto);

    [
        { x: x0, titulo: "Resumen actual", resumen: resumenActual },
        { x: x0 + anchoResumen + 4, titulo: "Resumen propuesto", resumen: resumenPropuesto },
    ].forEach(({ x, titulo, resumen }) => {

        doc.setDrawColor(120, 120, 120);
        doc.rect(x, y, anchoResumen, altoResumen, "S");

        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, anchoResumen, 6, "F");
        doc.rect(x, y, anchoResumen, 6, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(titulo, x + anchoResumen / 2, y + 4.2, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);

        const lineas = [
            ...ORDEN_SIMBOLOS.map(
                (tipo) => `${SIMBOLOS[tipo].etiqueta}: ${resumen.conteos[tipo]}`
            ),
            `Tiempo total: ${resumen.tiempoTotal.toFixed(2)} min`,
            `Distancia total: ${resumen.distanciaTotal.toFixed(2)} m`,
            "Costo: -",
        ];

        let yLinea = y + 10.5;

        const colIzq = x + 4;
        const colDer = x + anchoResumen / 2 + 4;

        lineas.forEach((linea, i) => {

            const columnaX = i < 5 ? colIzq : colDer;
            const filaY = y + 10.5 + (i % 5) * 4.6;

            doc.text(linea, columnaX, filaY);

        });

    });

    y += altoResumen + 6;

    return y;

}


/* =====================================================
   TABLA PRINCIPAL DE UNA SECCIÓN
   ===================================================== */

function dibujarTablaSeccion(doc, filas, yInicio, datos, metodo) {

    if (!tieneContenido(filas)) {

        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(
            "No se han registrado pasos para este método.",
            297 / 2, yInicio + 10, { align: "center" }
        );
        doc.setTextColor(0, 0, 0);

        return;

    }

    const cuerpo = filas.map((fila, indice) => [
        indice + 1,
        fila.descripcion && fila.descripcion.trim() !== "" ? fila.descripcion.trim() : "-",
        "",
        fila.simbolo ? SIMBOLOS[fila.simbolo].etiqueta : "—",
        pdfNumero(fila.tiempo).toFixed(2),
        pdfNumero(fila.distancia).toFixed(2),
        fila.metodo && fila.metodo.trim() !== "" ? fila.metodo.trim() : "-",
    ]);

    const indiceColSimbolo = 2;

    doc.autoTable({

        head: [[
            "#", "Descripción", "Símbolo", "Tipo",
            "Tiempo (min)", "Distancia (m)", "Método recomendado",
        ]],

        body: cuerpo,

        startY: yInicio,

        margin: { top: 24, left: PDF_MARGEN, right: PDF_MARGEN, bottom: 14 },

        styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 1.8,
            lineColor: [120, 120, 120],
            lineWidth: 0.2,
            valign: "middle",
        },

        headStyles: {
            fillColor: [17, 17, 17],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
        },

        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 70 },
            2: { cellWidth: 18, halign: "center" },
            3: { cellWidth: 26, halign: "center" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 22, halign: "right" },
            6: { cellWidth: "auto" },
        },

        didParseCell: (data) => {

            if (data.section === "body" && data.column.index === indiceColSimbolo) {

                data.cell.text = [];

            }

        },

        didDrawCell: (data) => {

            if (data.section !== "body" || data.column.index !== indiceColSimbolo) return;

            const fila = filas[data.row.index];

            if (!fila || !fila.simbolo) return;

            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            const r = Math.min(data.cell.width, data.cell.height) * 0.3;

            dibujarSimboloPDF(doc, fila.simbolo, cx, cy, r);

        },

        didDrawPage: (data) => {

            if (data.pageNumber > 1) {

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text(
                    `Diagrama de flujo de proceso — ${datos.producto || "(sin nombre)"} — Método ${metodo === "actual" ? "actual" : "propuesto"} (cont.)`,
                    297 / 2, 12, { align: "center" }
                );

            }

        },

    });

}


/* =====================================================
   PÁGINA DE COMPARACIÓN ACTUAL VS PROPUESTO
   ===================================================== */

function dibujarPaginaComparacion(doc, datos) {

    doc.addPage();

    const x0 = PDF_MARGEN;
    let y = PDF_MARGEN;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Comparación: método actual vs. propuesto", 297 / 2, y + 5, { align: "center" });

    y += 16;

    const resumenActual = calcularResumen(datos.actual);
    const resumenPropuesto = calcularResumen(datos.propuesto);

    const filasComparacion = [
        ["Pasos totales", resumenActual.pasos, resumenPropuesto.pasos, 0],
        ["Tiempo total (min)", resumenActual.tiempoTotal, resumenPropuesto.tiempoTotal, 2],
        ["Distancia total (m)", resumenActual.distanciaTotal, resumenPropuesto.distanciaTotal, 2],
    ];

    doc.autoTable({

        head: [["Indicador", "Actual", "Propuesto", "Ahorro"]],

        body: filasComparacion.map(([etiqueta, actual, propuesto, decimales]) => {

            const diferencia = actual - propuesto;
            const signo = diferencia > 0 ? "-" : diferencia < 0 ? "+" : "";

            return [
                etiqueta,
                actual.toFixed(decimales),
                propuesto.toFixed(decimales),
                `${signo}${Math.abs(diferencia).toFixed(decimales)}`,
            ];

        }),

        startY: y,

        margin: { left: PDF_MARGEN, right: PDF_MARGEN },

        styles: {
            font: "helvetica",
            fontSize: 10,
            cellPadding: 3,
            valign: "middle",
        },

        headStyles: {
            fillColor: [17, 17, 17],
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },

        columnStyles: {
            0: { cellWidth: 70 },
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right", fontStyle: "bold" },
        },

    });

}


/* =====================================================
   CONSTRUCCIÓN COMPLETA DEL DOCUMENTO
   ===================================================== */

function construirPDF(datos) {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    });

    // --- Sección: método actual ---
    let y = dibujarEncabezadoSeccion(doc, datos, "actual");
    dibujarTablaSeccion(doc, datos.actual, y, datos, "actual");

    // --- Sección: método propuesto ---
    doc.addPage();
    y = dibujarEncabezadoSeccion(doc, datos, "propuesto");
    dibujarTablaSeccion(doc, datos.propuesto, y, datos, "propuesto");

    // --- Comparación (solo si ambos métodos tienen datos) ---
    if (tieneContenido(datos.actual) && tieneContenido(datos.propuesto)) {

        dibujarPaginaComparacion(doc, datos);

    }

    // --- Numeración de páginas (pasada final) ---
    const totalPaginas = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPaginas; i++) {

        doc.setPage(i);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        doc.text(`Página ${i} de ${totalPaginas}`, 297 - PDF_MARGEN, 210 - 4, { align: "right" });

        doc.setTextColor(0, 0, 0);

    }

    return doc;

}


/* =====================================================
   VISTA PREVIA (modal + iframe)
   ===================================================== */

function mostrarVistaPrevia(datos) {

    const doc = construirPDF(datos);

    const url = doc.output("bloburl");

    document.getElementById("iframe-vista-previa").src = url;
    document.getElementById("modal-vista-previa").classList.remove("hidden");

}

function cerrarVistaPrevia() {

    document.getElementById("modal-vista-previa").classList.add("hidden");
    document.getElementById("iframe-vista-previa").src = "";

}


/* =====================================================
   DESCARGA DEL PDF
   ===================================================== */

function descargarPDF(datos) {

    const doc = construirPDF(datos);

    const nombreArchivo = `diagrama-flujo-${pdfSlug(datos.producto)}.pdf`;

    doc.save(nombreArchivo);

}


/* =====================================================
   EVENTOS DEL MODAL
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const btnCerrar = document.getElementById("cerrar-vista-previa");
    const overlay = document.getElementById("modal-vista-previa");

    if (btnCerrar) btnCerrar.addEventListener("click", cerrarVistaPrevia);

    if (overlay) {

        overlay.addEventListener("click", (evento) => {

            if (evento.target === overlay) cerrarVistaPrevia();

        });

    }

});
