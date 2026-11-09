/* Exporta el SVG completo, incluso la parte fuera del área visible. */
async function exportarJPG() {
    const boton = document.getElementById("exportar-jpg");
    const estado = document.getElementById("estado-exportacion");

    if (boton && boton.disabled) {
        return false;
    }

    if (boton) boton.disabled = true;
    if (estado) estado.textContent = "Preparando el JPG…";

    let urlSVG = null;
    let urlJPG = null;
    let lienzo = null;
    let enlace = null;

    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        // Incluye las ediciones que todavía no se han generado en pantalla.
        generarDiagrama();

        const diagrama = document.getElementById("ishikawa");
        if (!diagrama) throw new Error("No se encontró el diagrama.");

        const dimensiones = (diagrama.getAttribute("viewBox") || "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        const ancho = dimensiones[2];
        const alto = dimensiones[3];

        if (
            dimensiones.length !== 4 ||
            !dimensiones.every(Number.isFinite) ||
            ancho <= 0 ||
            alto <= 0
        ) {
            throw new Error("El diagrama no tiene dimensiones válidas.");
        }

        // Duplica la resolución, salvo que se alcancen los límites de memoria.
        const escala = Math.min(
            2,
            8192 / ancho,
            8192 / alto,
            Math.sqrt(16000000 / ancho / alto)
        );
        const anchoImagen = Math.max(1, Math.floor(ancho * escala));
        const altoImagen = Math.max(1, Math.floor(alto * escala));

        const copia = diagrama.cloneNode(true);
        copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        copia.setAttribute("width", anchoImagen);
        copia.setAttribute("height", altoImagen);
        // Evita que el tamaño CSS usado en la página recorte la imagen.
        copia.style.width = `${anchoImagen}px`;
        copia.style.height = `${altoImagen}px`;
        copia.style.minWidth = "0";
        copia.style.maxWidth = "none";
        copia.style.display = "block";

        const contenidoSVG = new XMLSerializer().serializeToString(copia);
        const archivoSVG = new Blob([contenidoSVG], {
            type: "image/svg+xml;charset=utf-8"
        });
        urlSVG = URL.createObjectURL(archivoSVG);

        const imagen = new Image();
        await new Promise((resolve, reject) => {
            imagen.onload = resolve;
            imagen.onerror = () => reject(new Error("No se pudo leer el SVG."));
            imagen.src = urlSVG;
        });

        lienzo = document.createElement("canvas");
        lienzo.width = anchoImagen;
        lienzo.height = altoImagen;

        const contexto = lienzo.getContext("2d");
        if (!contexto) throw new Error("No se pudo crear la imagen.");

        // JPEG no conserva transparencia: utiliza un fondo blanco explícito.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, anchoImagen, altoImagen);
        contexto.drawImage(imagen, 0, 0, anchoImagen, altoImagen);

        const archivoJPG = await new Promise((resolve, reject) => {
            lienzo.toBlob((archivo) => {
                if (archivo && archivo.type === "image/jpeg") resolve(archivo);
                else reject(new Error("No se pudo generar el archivo JPG."));
            }, "image/jpeg", 0.95);
        });

        const problema = document.getElementById("problema");
        const nombre = (problema ? problema.value : "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80)
            .replace(/-+$/g, "") || "6m";

        urlJPG = URL.createObjectURL(archivoJPG);
        enlace = document.createElement("a");
        enlace.href = urlJPG;
        enlace.download = `ishikawa-${nombre}.jpg`;
        enlace.hidden = true;
        document.body.appendChild(enlace);
        enlace.click();

        // Da tiempo al navegador para consumir el archivo antes de liberarlo.
        const urlDescarga = urlJPG;
        setTimeout(() => URL.revokeObjectURL(urlDescarga), 60000);
        urlJPG = null;

        if (estado) {
            estado.textContent = `JPG listo (${anchoImagen} × ${altoImagen} píxeles). Se inició la descarga.`;
        }
        return true;
    } catch (error) {
        console.error("exportarJPG: no se pudo exportar el diagrama de Ishikawa.", error);
        if (estado) {
            estado.textContent = "No se pudo crear el JPG. Vuelve a intentarlo.";
        }
        return false;
    } finally {
        if (enlace) enlace.remove();
        if (urlSVG) URL.revokeObjectURL(urlSVG);
        if (urlJPG) URL.revokeObjectURL(urlJPG);
        if (lienzo) {
            lienzo.width = 0;
            lienzo.height = 0;
        }
        if (boton) boton.disabled = false;
    }
}

document.getElementById("exportar-jpg").addEventListener("click", exportarJPG);
