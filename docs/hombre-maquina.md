# Hombre–Máquina y persistencia global

Actualización del 9 de noviembre de 2026.

## Interfaz y compatibilidad

El nombre visible es **Hombre–Máquina** en todas las páginas. Se mantiene la
ruta `operador-maquina.html`, el endpoint antiguo y la clave de borrador para
que los enlaces, archivos y datos anteriores sigan funcionando. Al recuperar
un estudio anterior se conserva su configuración como **servicio sincrónico**
y se incorporan las otras herramientas con sus valores iniciales.

Las tres herramientas guardan sus entradas de forma independiente dentro del
mismo estudio. Cambiar de herramienta no borra las otras configuraciones.
Los resultados se recalculan a partir de las entradas recuperadas.

## Herramientas cuantitativas

Los tres formularios usan la misma moneda elegida por el usuario para costos
por hora de máquina y persona. El costo contempla la hora completa, incluyendo
esperas. Con ambos costos en cero se calculan tiempos y producción, pero no se
recomienda una asignación económica. Las recomendaciones están limitadas al
rango de alternativas que muestra cada tabla.

### Servicio sincrónico

Una persona, máquinas idénticas y tiempos constantes. Se incluyen carga/descarga
`L`, marcha automática `M` y trabajo externo/traslado `W`, en minutos.
Se supone una pieza por máquina y ronda, después del arranque.

```
Ciclo = max[N(L + W), L + M]
Producción/h = 60N / Ciclo
Costo por pieza = (salario/h + N × costo máquina/h) / Producción/h
```

El cronograma conserva atención, automático, trabajo externo/traslado y espera.
La tabla compara de 1 a 30 máquinas, e identifica el menor costo unitario.
La relación ideal `(L + M)/(L + W)` puede no ser entera.

### Servicio aleatorio

Se usa un modelo binomial con probabilidad `p` de solicitar atención por máquina,
solicitudes independientes y `r` operadores. Para `k` solicitudes simultáneas:

```
P(k) = combinación(N,k) × p^k × (1−p)^(N−k)
Espera esperada = suma[max(k−r,0) × P(k)]
Horas-máquina perdidas = jornada_h × espera esperada
Producción ajustada/h = (N − espera esperada) × producción nominal por máquina/h
```

Esta herramienta descuenta **solo la interferencia por falta de atención**.
No descuenta nuevamente el tiempo propio del servicio ni otras paradas.
No es una simulación de reparaciones o una estimación de disponibilidad total.
Presenta la distribución de solicitudes y compara de 1 a N operadores, para
grupos de hasta 100 máquinas. Los costos por pieza incluyen a todos los
operadores y máquinas de cada alternativa.

### Relaciones complejas

Una persona comparte máquinas y se estiman tiempos medios. Con `X = M/L`, para
`N ≥ 7` se calcula la interferencia por la fórmula aproximada de Wright:

```
I = 50 × [√((1 + X − N)² + 2N) − (1 + X − N)]
Espera por máquina = L × I/100
Ciclo medio = M + L + Espera
Producción/h = 60N / Ciclo medio
```

`I` es porcentaje del **tiempo medio de servicio**, y puede exceder 100 %.
La pantalla separa ese valor del porcentaje de espera sobre el ciclo completo.
Para grupos pequeños se puede capturar `I` de una curva correspondiente a N/X
o de una medición. No se extrapola Wright por debajo de siete máquinas ni se
inventan valores de curvas. La aplicación verifica que la carga resultante
no exija más del 100 % de una persona. Límite: 200 máquinas.

La implementación usa una forma algebraicamente equivalente y estable cuando
X es grande para evitar perder precisión por restar números casi iguales.

### Referencias

- [Dalisay y colaboradores, estudio de asignación hombre–máquina (2022)](https://journals.researchsynergypress.com/index.php/issues/article/download/951/488/5143):
  modelos de servicio sincrónico, binomial y comparación de costo por unidad.
- Freivalds y Niebel, *Methods, Standards, and Work Design*, 13.ª edición,
  capítulo 2, pp. 52–54: servicio aleatorio, interferencia y fórmula de Wright.
  [Texto de la edición consultada](https://studylib.net/doc/26977655/methods-standards-work-design-by-andris-freivalds-benjami...).
- DesignTools proporcionado por el usuario: referencia de funciones y campos
  de los formularios de servicio sincrónico y aleatorio; no se ejecutan sus binarios.

## Guardado en los ocho módulos

| Módulo | Datos conservados |
|---|---|
| Ishikawa | Problema y causas de las seis M, incluidas filas vacías |
| Pareto | Causas, frecuencias, orden de captura y umbral |
| Flujo | Datos generales, color, pestaña activa y ambos métodos completos |
| Recorrido | Nombres, símbolos, orden, coordenadas y escala |
| Hombre–Máquina | Nombre, herramienta elegida y entradas de las tres herramientas |
| Estudio de tiempos | Configuración, elementos, observaciones, valoración y suplementos |
| Balanceo | Tareas, precedencias, incompatibilidades y parámetros de producción |
| Muestreo | Agenda, configuración, operadores, categorías, registros y notas |

- **Borrador:** se guarda automáticamente en `localStorage`, con una clave
  independiente por módulo. Se completa el guardado pendiente al salir o al
  ocultar la pestaña, incluso antes de terminar el pequeño retardo de escritura.
- **Guardar estudio:** descarga JSON v1 con módulo y datos. Funciona también
  si el navegador impide guardar el borrador; se muestra un aviso de ese fallo.
- **Cargar estudio:** comprueba módulo, versión y estructura antes de pedir
  confirmación para reemplazar el estudio abierto. Un archivo inválido no lo borra.
- **Nuevo:** pide confirmación y reemplaza únicamente el módulo actual.

Los datos no se envían a una cuenta ni se guardan en una base de datos del
servidor. Para trasladarlos a otro navegador, equipo o dirección local, utiliza
Guardar/Cargar. El borrado de los datos del navegador elimina sus borradores.
Los archivos admiten hasta 64 MiB; los diagramas exploratorios admiten hasta
2000 filas/estaciones por lista. Un borrador ilegible no se sobrescribe sin
una edición o una acción explícita del usuario.

## Archivos principales y validación

- `backend/hombre_maquina.py`: modelos, fórmulas y comparaciones.
- `backend/main.py`: tres rutas nuevas bajo `/api/hombre-maquina/`.
- `frontend/operador-maquina.js`: selección de herramienta, migración y resultados.
- `frontend/persistencia.js`: guardado, carga, borradores y ciclo de vida.
- `frontend/persistencia-diagramas.js`: adaptadores y validación de los cuatro diagramas.
- `frontend/estudios-comun.js`: integración del guardado compartido en los estudios.
- `frontend/index.html`: retirada de la introducción y las tarjetas redundantes.

Pruebas reproducibles desde la raíz del proyecto:

```bash
backend/venv/bin/python -m unittest discover -s tests -v
node tests/frontend-estudios.cjs
node tests/persistencia.cjs
```

Se comprobaron 37 casos de cálculo/API, 16 comprobaciones de interacción con
DOM simulado y 12 de persistencia/migración. También se verificaron en un navegador
real los resultados de las tres herramientas, la recuperación al recargar en
Hombre–Máquina y los cuatro diagramas, y la página principal simplificada.
