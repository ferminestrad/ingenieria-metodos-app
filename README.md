# Ingeniería de Métodos — Sistema appweb

App para la materia de Ingeniería de Métodos (y base para tu tesis).
Frontend en HTML/CSS/JS y backend en Python (FastAPI) que hace los
cálculos matemáticos/estadísticos.

## Publicar el piloto y entregar el manual

- [Qué subir a GitHub](docs/01-guia-github.md): inventario exacto y exclusiones.
- [Tutorial de Render](docs/02-guia-render.md): cuenta, conexión, comandos,
  variables opcionales y comprobación del enlace.
- [Manual de usuario](docs/03-manual-usuario.md): Ishikawa, Balanceo y
  Hombre-Máquina, guardado/carga y solución de problemas.
- Versiones PDF de los tres documentos en `output/pdf/`.

Para Render, la raíz del repositorio debe contener `backend/` y `frontend/`.
El archivo `render.yaml` ofrece una configuración de Blueprint equivalente.

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT
```

El segundo comando es para Render, que proporciona `PORT`. La ejecución local
se explica más abajo. Se fijaron Python 3.14.7 y las versiones directas de
FastAPI, Uvicorn y Pydantic usadas en las pruebas locales. Esta versión no usa
`SECRET_KEY` ni `DATABASE_URL`: configurarlas no activa autenticación ni
persistencia en PostgreSQL. El guardado sigue siendo local al navegador y en
archivos exportables. No hay una URL pública confirmada en esta entrega.

## Estructura

```
proyecto/
├── backend/
│   ├── main.py            # servidor FastAPI (API + sirve el frontend)
│   ├── westinghouse.py    # tabla de calificación (editable)
│   ├── suplementos.py     # tabla de suplementos OIT (editable)
│   ├── calculos.py        # fórmulas: TO, TN, TS, tamaño de muestra
│   ├── schemas.py         # validación de datos de entrada
│   ├── estudios.py        # cálculos de los cuatro módulos de medición
│   ├── estudios_schemas.py # entradas de los nuevos módulos
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── exploratorias.html       # Hub: elige herramienta exploratoria
    ├── exploratorias-hub.css
    ├── ishikawa.html            # Diagrama de Ishikawa
    ├── ishikawa.css / ishikawa.js
    ├── diagrama-flujo.html      # Diagrama de flujo de proceso (+ PDF)
    ├── diagrama-flujo.css
    ├── diagrama-flujo.js        # estado, interacción, cálculos
    ├── pdf-diagrama.js          # generación vectorial del PDF
    ├── simbolos.js              # metadata + símbolos (compartido)
    ├── pareto.html / .css / .js
    ├── recorrido.html / .css / .js
    ├── registro-analisis.html / .js # estudio de tiempos ampliado
    ├── operador-maquina.html / .js
    ├── balanceo-lineas.html / .js
    ├── muestreo-trabajo.html / .js
    ├── estudios-comun.js / estudios.css
    └── style.css
```

Los cuatro módulos de medición comparten un menú propio, accesible desde
**Registro y análisis** o **Hombre–Máquina**. La página principal conserva
la navegación y los botones principales; se retiraron los bloques de
introducción y tarjetas duplicadas.

## Cómo correrlo

```bash
cd backend
python -m venv venv
source venv/bin/activate        # en Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Abre **http://127.0.0.1:8000** — el backend sirve el frontend
directamente, no necesitas nada más (ni Live Server, ni CORS).

## Los cuatro módulos de medición

- **Hombre–Máquina:** servicio sincrónico, servicio aleatorio binomial y relaciones
  complejas (Wright o interferencia introducida), con producción, esperas y costos.
- **Estudio de tiempos:** observaciones por ciclo/elemento, cronometraje continuo
  o vuelta a cero, tres unidades, valoración global o individual, suplementos,
  exclusiones con motivo, TO/TN/TS y conciliación del tiempo registrado.
- **Balanceo de líneas:** precedencias, incompatibilidades, ciclo o demanda,
  estaciones por pesos posicionales y comparación gráfica de cargas.
- **Muestreo del trabajo:** agenda aleatoria con jornadas y descansos, operadores,
  categorías, captura de visitas y proporciones con intervalos Wilson.

Incluyen borrador local, archivos JSON para guardar/cargar e impresión de
resultados. Los tiempos estándar pueden enviarse directamente al balanceo.
También tienen guardado automático y archivos JSON **Ishikawa, Pareto,
diagrama de flujo y recorrido**. El borrador se guarda al editar, salir de la
página o cambiar de pestaña. Los archivos se validan antes de reemplazar datos.
El almacenamiento pertenece al navegador y dirección utilizados; descargar
el archivo permite mover el estudio o conservar versiones independientes.

Consulta [Hombre–Máquina y persistencia global](docs/hombre-maquina.md) para
los supuestos de las tres herramientas, compatibilidad y comprobaciones.
La documentación completa está en [Métodos implementados](docs/metodos-implementados.md),
incluyendo fórmulas, supuestos, límites, compatibilidad y pruebas.

Los cálculos requieren abrir la aplicación en **http://127.0.0.1:8000** con el
servidor iniciado. Abrir los HTML directamente como archivos no habilita la API.

## Cálculos del estudio de tiempos

Para cada elemento de la operación:

1. **Tiempo observado (TO)**: promedio de tus lecturas.
2. **Tamaño de muestra recomendado**: aproximación normal
   `n' = ceil[(Z·s / (E·x̄))²]`, con 95.45% de confianza y ±5% de error
   por defecto; ambos parámetros se pueden editar. Se requieren al menos dos
   observaciones para estimar la dispersión.
3. **Tiempo normal (TN)**: promedio de cada duración × su factor de valoración.
   Se puede usar Westinghouse o porcentaje, global o individual.
4. **Tiempo estándar (TS)** = TN × (1 + % suplementos OIT).
5. **Tiempo estándar total** = suma de TS de todos los elementos.

Las tablas de Westinghouse y de suplementos están en archivos Python
separados (`westinghouse.py`, `suplementos.py`) — si tu edición del
libro de Niebel trae valores distintos, los cambias ahí y se
actualizan solos en toda la app (frontend incluido, porque los
selects se construyen leyendo `/api/opciones`).

## "Herramientas exploratorias" ahora es un hub

`exploratorias.html` dejó de ser la página de Ishikawa y ahora es un
índice con tarjetas hacia: Ishikawa, Diagrama de flujo, Pareto y
Diagrama de recorrido. Así el menú de arriba no crece cada vez que
agreguemos una herramienta nueva — solo se agrega una tarjeta al hub.

## Diagrama de Ishikawa (6 M y descarga JPG)

Incluye Método, Mano de obra, Maquinaria, Materiales, Medición y Medio
ambiente. Las causas largas se dividen en varias líneas y el dibujo
aumenta su altura según el contenido. El efecto aparece completo dentro
de una cabeza triangular.

Después de capturar las causas, **Generar diagrama** actualiza la vista.
**Descargar JPG** también incorpora las últimas ediciones y descarga el
diagrama completo con fondo blanco, aunque no quepa en la pantalla.
La exportación funciona en el navegador, sin librerías externas, mediante
`frontend/ishikawa-export.js`. La imagen usa hasta el doble de resolución,
con límites de 8192 píxeles por lado y 16 millones de píxeles en total.

## Qué hace el módulo "Diagrama de flujo de proceso" (+ generación de PDF)

Réplica del formato de la hoja de Excel (Descripción + símbolo ASME:
Operación/Transporte/Inspección/Demora/Almacén + Tipo + Tiempo +
Distancia + Método recomendado), capturado en una tabla dinámica en
el navegador, cuyo resultado final es un **PDF vectorial** con el
formato del diagrama de flujo de proceso — ya no exporta CSV/XLS.

**Estado centralizado** (`estado` en `diagrama-flujo.js`): un solo
objeto con los datos generales del estudio (producto, ubicación,
actividad, fecha, operador, analista, tipo, máquina, comentarios) y
los arreglos `actual` / `propuesto`. Tabla web, resumen, comparación
y PDF leen todos de esta misma fuente — nada se duplica.

**Flujo de trabajo:**

1. Llenas los datos generales y la tabla (pestañas **Método actual**
   / **Método propuesto**), igual que antes: símbolo pintable,
   Tipo derivado, Tiempo/Distancia con validación (≥ 0), mover/
   eliminar pasos.
2. **Vista previa** — genera el PDF en memoria y lo muestra en un
   modal con `<iframe>`, sin descargar nada todavía.
3. **Generar PDF** — genera el mismo documento y lo descarga como
   `diagrama-flujo-<producto>.pdf`.

**Qué contiene el PDF** (`pdf-diagrama.js`, formato A4 horizontal):

- Una sección completa por método (actual y propuesto), cada una
  con: encabezado ("Diagrama de Flujo del proceso (Tipo) para la
  producción de X"), datos generales, **ambos** resúmenes (actual y
  propuesto, lado a lado — igual que en tu Excel de referencia) y la
  tabla de pasos de ese método.
- Los símbolos se dibujan **vectorialmente** con primitivas de
  jsPDF dentro de cada celda (círculo, flecha, cuadrado, "D",
  triángulo invertido) — nunca es una captura de pantalla del HTML.
- Si un método no tiene pasos capturados, esa sección muestra un
  aviso en vez de una tabla vacía.
- Página final de comparación (pasos/tiempo/distancia, actual vs.
  propuesto) — solo aparece si ambos métodos tienen datos.
- Paginación automática: si la tabla no cabe en una página, sigue en
  la siguiente con un encabezado corto de continuación; al final se
  numeran todas las páginas ("Página X de N").
- El campo **Costo** se deja como "-" — tu app no calcula costos
  todavía (evita inventar una fórmula, como pediste).

**Dependencias nuevas** (cargadas por CDN en `diagrama-flujo.html`,
solo esta página las necesita):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
```

Necesitas conexión a internet la primera vez que abras la página
(o siempre, ya que no están vendorizadas localmente). Si prefieres
no depender de un CDN, descarga esos dos archivos `.js` y cámbialos
por rutas locales dentro de `frontend/`.

⚠️ **Nota de honestidad sobre las pruebas**: en el entorno donde
generé este código no tuve acceso a internet, así que no pude cargar
el jsPDF real para probarlo. Verifiqué toda la lógica (armado de
datos, hooks de AutoTable, dibujo de símbolos, paginación, casos sin
pasos) corriéndola contra un *stub* que imita la API de jsPDF y lanza
error si algo se llama con argumentos inválidos — no hubo ningún
error. Pero **no vi el PDF real renderizado**, así que la primera vez
que lo pruebes en tu máquina, revisa con calma que el formato/
espaciado se vea como esperas; puede necesitar ajustes finos de
posición (todos los números de posición están juntos al inicio de
cada función en `pdf-diagrama.js`, fáciles de mover).

## Nota sobre las tablas

Los valores de las tablas de Westinghouse y de suplementos OIT que
vienen precargados son los valores estándar más citados en la
literatura de ingeniería de métodos, pero **hay ediciones del libro
de Niebel con ligeras variaciones**. Antes de usar la app para tu
tesis o para entregar tarea, compara estos valores contra tu edición
y ajústalos si hace falta — están aislados en dos archivos para que
sea un cambio de un minuto.
