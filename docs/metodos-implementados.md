# Los cuatro módulos de medición del trabajo

Implementación del 9 de noviembre de 2026. Utiliza la interfaz de la aplicación
existente: tipografía Arial, fondos claros, navegación y botones negros. Los
accesos están en el menú común de estos cuatro módulos, disponible desde
Registro y análisis o Hombre–Máquina.

DesignTools V4 sirvió como referencia funcional a partir del análisis del ZIP:
atención sincronizada, estudio continuo/vuelta a cero, precedencias y pesos
posicionales, y las agendas/categorías del manual QuikSamp. El código de cálculo
es nuevo. No se ejecutan sus binarios ni se presupone que sus formatos antiguos
sean compatibles con esta aplicación. No se añadieron módulos de ergonomía,
estadística, simulación ni otros módulos fuera de los cuatro solicitados.

## Uso común

1. Inicia el servidor desde `backend` con `uvicorn main:app --reload`.
2. Abre `http://127.0.0.1:8000` y elige el módulo.
3. Sustituye los valores de ejemplo por los de tu operación y pulsa **Calcular
   resultados**. Editar cualquier dato invalida el resultado anterior.
4. **Guardar estudio** descarga un archivo JSON editable. **Cargar estudio**
   recupera un archivo del mismo módulo, previa confirmación de reemplazo.
5. **Imprimir resultados** abre la impresión del navegador; desde allí puedes
   elegir guardar como PDF. Se necesita calcular primero.

También se conserva un borrador independiente por módulo en este navegador.
Si el almacenamiento se llena o está bloqueado, aparece un aviso para descargar
el archivo. Los borradores del sitio local y los de páginas abiertas directamente
como archivos pueden pertenecer a almacenamientos distintos: trasládalos con
Guardar/Cargar. Abrir un HTML mediante `file://` no activa la API de cálculos.

Formato de archivo: `{ "version": 1, "modulo": "…", "datos": { … } }`.
Las claves de los estudios son `operador-maquina`, `estudio-tiempos`, `balanceo-lineas`
y `muestreo-trabajo`; los diagramas también tienen guardado, descrito en
[la actualización de persistencia](hombre-maquina.md). Se guardan entradas y marcas originales; los resultados se
recalculan al cargar. Los archivos de DesignTools (`.TSD`, `.LBD`, `.OUT`, etc.)
no se importan directamente. Los archivos JSON se validan antes de reemplazar
el borrador, con un máximo de 64 MiB por archivo.

## Hombre–Máquina · servicio sincrónico

`frontend/operador-maquina.html` y `operador-maquina.js`.
API: `POST /api/operador-maquina`. Cálculo: `operador_maquina()`.

Modelo: una persona atiende de 1 a 30 máquinas idénticas en orden fijo, con
tiempos constantes. Cada atención corresponde a una pieza. Se representa un
ciclo repetitivo en régimen estable, después del arranque; no es una simulación
de averías o de atención aleatoria. La máquina se detiene durante el servicio.

Entradas, en minutos: atención manual `s > 0`, automático `a ≥ 0`, traslado por
máquina `t ≥ 0` (incluido el regreso) y número de máquinas `m`.

- Ciclo de ronda: `C = max[m(s+t), s+a]`.
- Producción conjunta: `60m/C` piezas/hora.
- Ocupación del operador: `m(s+t)/C`.
- Trabajo automático de cada máquina: `a/C`.
- Espera del operador: `C−m(s+t)`; espera por máquina: `C−s−a`.

El cronograma SVG diferencia atención manual, automático, traslado y espera;
incluye los tramos que provienen de la ronda anterior. La comparación mantiene
los mismos tiempos y varía el número de máquinas. La ampliación actual también
incorpora costos, servicio aleatorio y relaciones complejas: véase
[Hombre–Máquina y persistencia global](hombre-maquina.md).

## Estudio de tiempos

Amplía `frontend/registro-analisis.html` y `registro-analisis.js`.
API: `POST /api/estudio-tiempos`. Cálculo: `calcular_estudio()`.

Cada elemento tiene identificador, nombre, Westinghouse y suplementos. Cada
observación conserva elemento, ciclo, lectura original, valoración, tipo y motivo
de exclusión. Se pueden capturar minutos, segundos o centésimas de minuto.
Cambiar la unidad convierte las lecturas existentes; los resultados son minutos.

- **Vuelta a cero:** cada lectura es una duración.
- **Continuo:** duración = lectura actual − lectura anterior. La primera resta
  la lectura inicial del cronómetro. Las lecturas deben aumentar, sin reiniciar
  al cambiar de ciclo. Cambiar el método conserva los números: hay que revisar
  que correspondan al nuevo método.
- **Valoración:** porcentaje global, porcentaje por observación, Westinghouse
  global o Westinghouse por elemento. Las tablas se obtienen de `/api/opciones`.
- **Exclusiones:** las observaciones atípicas o ajenas requieren un motivo. No
  participan en TO/TN/TS, pero sí en la conciliación. En continuo también forman
  parte de la secuencia de lecturas, evitando atribuir su tiempo a otro elemento.
- **TO:** media de duraciones normales. **TN:** media de duración × factor; con
  valoración individual no se multiplica TO por el promedio simple de factores.
- **TS:** `TN × (1 + suplemento)`. El porcentaje se aplica sobre TN. Se mantiene
  la tabla existente de la aplicación: 9 % constante más selecciones variables;
  también se permite indicar manualmente el porcentaje. Una categoría sin
  selección explícita aporta 0 % adicional.
- **Cantidad recomendada:** `ceil[(z·s/(e·media))²]`, con desviación muestral y
  error relativo `e = error_pct/100`. Se usa el cuantil normal exacto; confianza
  y error son editables. Se necesitan al menos dos lecturas para estimar la
  dispersión. Es una aproximación para planificar la muestra, no una garantía
  de precisión ni una corrección por dependencia entre ciclos.
- **Control:** tiempo normal + atípico + ajeno + antes + después. Se compara con
  la duración total del estudio, si se proporciona. La lectura inicial es la
  referencia del cronómetro; el tiempo anterior se registra aparte.

**Enviar tiempos a Balanceo de líneas** transfiere cada TS, con su identificador
y nombre, sin redondearlo. El balanceo solicita confirmar antes de sustituir sus
tareas. Las precedencias deben capturarse: no se deducen del orden de la tabla.
Límites: 200 elementos y 5000 observaciones por estudio.

Compatibilidad: siguen disponibles `/api/tiempo-estandar` y
`/api/numero-observaciones` con sus contratos y cálculos anteriores. El módulo
antiguo no tenía guardado de estudios. Los mismos TO/TN/TS se conservan para
entradas equivalentes; la nueva recomendación de muestra utiliza el cuantil
normal exacto en lugar de aproximarlo a una confianza tabulada y ya no declara
suficiente una sola lectura. Las tablas existentes no se modificaron.

## Balanceo de líneas

`frontend/balanceo-lineas.html` y `balanceo-lineas.js`.
API: `POST /api/balanceo-lineas`. Cálculo: `balancear()`.

Entradas: identificador, nombre, tiempo, predecesoras e incompatibles de cada
tarea. Se define el ciclo directamente o con `jornada disponible / demanda`.
Las referencias deben existir; se rechazan identificadores duplicados, ciclos
de precedencias y tareas que excedan el ciclo disponible.

Se aplica una heurística de **pesos posicionales**: tiempo de cada tarea más el
de todas sus sucesoras transitivas, contando cada sucesora una sola vez. Entre
las tareas elegibles se prioriza mayor peso, después mayor duración y luego
identificador. Se admite que una predecesora se ejecute antes dentro de la misma
estación. Las incompatibilidades se respetan en ambos sentidos.

Resultados: estaciones y secuencia propuesta, carga/ocio, gráfico de barras,
pesos, mínimo teórico `ceil(Σti/C)`, eficiencia `Σti/(estaciones·C)` y retraso
de balance `1−eficiencia`. La asignación no garantiza el óptimo global. El mínimo
teórico puede no ser alcanzable por las restricciones. Límite: 200 tareas.

## Muestreo del trabajo

`frontend/muestreo-trabajo.html` y `muestreo-trabajo.js`.
APIs: `POST /api/muestreo/plan` y `POST /api/muestreo/resumen`.
Cálculos: `plan_muestreo()`, `resumen_muestreo()` y `wilson()`.

Se configuran fechas, días de la semana, jornada, descansos, operadores,
categorías, proporción esperada, confianza y error absoluto en puntos
porcentuales. Una jornada nocturna termina al día siguiente; la fecha y el día
de semana seleccionados se refieren al inicio del turno.

La agenda elige minutos al azar, sin repetición, entre los minutos disponibles
fuera de descansos. La semilla opcional permite repetir una agenda. No hay
alarmas ni captura automática: se registra manualmente una categoría por
operador y visita. Se puede marcar una visita como omitida y agregar notas.

- Planificación: `ceil[z²·p(1−p)/e²]`, con `e = error_pp/100`. Si no se conoce
  una proporción previa, `p = 0.5` es la opción conservadora.
- El tamaño es **por operador**. Observar varias personas en una visita no
  aumenta el número individual de observaciones.
- El resumen excluye pendientes y omitidas del denominador. Muestra conteos,
  porcentajes e intervalos Wilson por operador/categoría y para la suma de las
  categorías marcadas como productivas. Sin registros, muestra «—», no 0 %.
- Los intervalos suponen observaciones representativas e independientes. La
  selección de minutos y el tamaño inicial no garantizan esas condiciones ni
  la precisión final. No se combina a los operadores como si fueran una muestra
  independiente única.

Límites: 91 días, 5000 visitas por agenda, 12 operadores y 20 categorías. Cada
operador tiene un registro por visita, hasta 60000 registros. Se puede solicitar
una cantidad menor para un piloto. Una nueva agenda reemplaza la anterior tras
confirmación; guarda su archivo primero. Esta versión no combina agendas.
Se bloquea la edición de operadores mientras exista una agenda para conservar
las referencias de las observaciones. Cambiar horarios no mueve visitas ya
generadas. El resumen usa la confianza/proporción/error que estén seleccionados.

## Archivos compartidos y comprobaciones

- `backend/estudios_schemas.py`: contratos, unidades, tipos, límites y validación.
- `backend/estudios.py`: cálculos independientes de la pantalla.
- `backend/main.py`: rutas antes del montaje de archivos estáticos.
- `frontend/estudios-comun.js`: controles, peticiones, SVG, estado, borrador y JSON.
- `frontend/estudios.css`: presentación y estilos de impresión.
- `frontend/index.html`: navegación a los módulos y portada simplificada.

Desde la raíz del proyecto, con las dependencias instaladas:

```bash
backend/venv/bin/python -m unittest discover -s tests -v
node tests/frontend-estudios.cjs
```

El segundo comando usa por defecto el Python del entorno `backend/venv`.
Se puede seleccionar otro mediante la variable `STUDY_TEST_PYTHON`.

Se verificaron 25 pruebas de cálculos/API y 16 comprobaciones de interacción
contra la API real en proceso. Cubren particiones de cronogramas, grafos con
precedencias, restricciones, unidades, exclusiones, valoración, agendas
nocturnas, descansos, intervalos, guardado/carga y transferencia de tiempos.
La prueba de interacción usa un DOM mínimo simulado: no verifica composición
visual, diálogos nativos de impresión ni descargas en un navegador real.
La actualización posterior añadió comprobaciones de persistencia y una revisión
en navegador de Hombre–Máquina, los cuatro diagramas y la portada. Los resultados
actualizados se describen en [Hombre–Máquina y persistencia](hombre-maquina.md).

## Referencias de método

- Manual y ejemplos proporcionados de DesignTools/QuikSamp: referencia de
  funciones; las unidades de archivos antiguos no se presuponen.
- [NPTEL, Work Sampling](https://archive.nptel.ac.in/content/storage2/courses/112107142/part1/lecture10.htm):
  observaciones de actividades en instantes seleccionados aleatoriamente.
- [NIST, intervalos de una proporción](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm):
  intervalo Wilson empleado en los resultados de muestreo.
- [NIST TN 2119](https://nvlpubs.nist.gov/nistpubs/TechnicalNotes/NIST.TN.2119.pdf):
  planificación del tamaño de muestra para una proporción.
- [Investigación sobre balanceo de líneas, ICRA 2000](https://iocnet.upc.edu/usuaris/raul.suarez/papers/icra00-bsmc.pdf):
  peso de tarea y sucesoras como regla de prioridad. La implementación especifica
  aquí sus desempates y restricciones; no se presenta como un optimizador exacto.
