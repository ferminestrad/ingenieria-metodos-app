# Manual de usuario

Ingeniería de Métodos | Pruebas piloto | Versión del 9 de noviembre de 2026

## 1. Bienvenida

Este sistema ayuda a registrar y analizar procesos de trabajo. Permite organizar posibles causas de un problema, distribuir tareas entre estaciones y estudiar la relación entre una persona y las máquinas que atiende.

Este manual explica **Ishikawa**, **Balanceo de líneas** y **Hombre-Máquina**. No necesitas instalar Python ni otros programas: abre el enlace que te entregue la persona responsable del piloto en tu navegador, con conexión a internet.

Los resultados dependen de los datos introducidos. Usa primero los ejemplos de práctica y después la información indicada por el responsable. Las propuestas de cálculo sirven para apoyar el análisis del proceso.

## 2. Entrar y orientarte

1. Abre el enlace del piloto. La página principal muestra Ingeniería de Métodos.
2. Para Ishikawa, entra a **Herramientas exploratorias** y selecciona **Diagrama de Ishikawa**.
3. Para Hombre-Máquina, utiliza el enlace del menú superior.
4. Para Balanceo, entra a **Registro y análisis** o a Hombre-Máquina y selecciona **Balanceo de líneas** en el menú de módulos.
5. El nombre Ingeniería de Métodos de la parte superior permite volver al inicio.

En Balanceo y Hombre-Máquina puedes escribir un **Nombre del estudio**, por ejemplo, “Práctica 1 - Ensamble”. Si aparecen datos de ejemplo o de una visita anterior, revísalos antes de calcular. En una pantalla pequeña, desliza horizontalmente dentro de las tablas o los diagramas para ver el contenido completo.

## 3. Guardar, cargar y comenzar otro estudio

Estos controles se encuentran en la parte superior de cada módulo.

| Control | Para qué sirve |
| --- | --- |
| Guardado automático | Conserva un borrador del módulo en el navegador que estás usando. |
| Guardar estudio | Descarga un archivo terminado en .json para conservar o trasladar el estudio. |
| Cargar estudio | Abre un archivo .json que guardaste desde ese mismo módulo. |
| Nuevo | Reemplaza el estudio actual por el estado inicial, después de pedir confirmación. |
| Imprimir resultados | En Balanceo y Hombre-Máquina, imprime el cálculo o permite elegir Guardar como PDF. |
| Descargar JPG | En Ishikawa, descarga una imagen del diagrama. |

**Para guardar una copia:** pulsa Guardar estudio y revisa la carpeta Descargas del equipo. Conserva el archivo con una identificación útil, como módulo, práctica y fecha. El navegador puede pedirte elegir una carpeta.

**Para recuperar una copia:** entra al mismo módulo, pulsa Cargar estudio, selecciona el archivo y confirma el reemplazo. Guarda primero el estudio abierto si lo necesitas. En Balanceo y Hombre-Máquina, pulsa Calcular resultados después de cargarlo. En Ishikawa, puedes pulsar Generar diagrama para revisar la representación.

El borrador automático no sustituye al archivo de respaldo. Se guarda por navegador, dispositivo y dirección web. No aparece por sí solo en otro celular o computadora; también puede perderse si borras los datos del navegador o usas navegación privada. Solo hay un borrador por módulo: descarga archivos para conservar versiones distintas.

Un JPG o PDF conserva el resultado para verlo o compartirlo, pero **no sirve para volver a editar el estudio**. Para continuar trabajando, guarda también el archivo .json. Los datos no se envían automáticamente al responsable del piloto.

## 4. Diagrama de Ishikawa

### Objetivo

Organizar las posibles causas de un problema en seis grupos, conocidos como las 6 M. El diagrama ayuda a ordenar ideas; no demuestra por sí solo que una causa sea verdadera.

### Pasos

1. En **Problema o efecto**, escribe el problema de forma concreta. Ejemplo: “Piezas entregadas con defectos”.
2. Escribe una posible causa en el grupo que corresponda.
3. Pulsa **+ Agregar causa** en ese grupo si necesitas otra fila. Para quitar una causa del dibujo, borra su texto; las filas vacías no se dibujan.
4. Pulsa **Generar diagrama**. Revisa que el problema y las causas sean correctos.
5. Corrige los textos si hace falta y genera de nuevo el diagrama. Utiliza frases breves para facilitar la lectura.
6. Pulsa **Guardar estudio** para conservar una copia editable y **Descargar JPG** para obtener la imagen.

| Grupo | Qué puedes registrar | Ejemplo de práctica |
| --- | --- | --- |
| Método | Procedimiento y forma de hacer el trabajo | Instrucciones de armado poco claras |
| Mano de obra | Capacitación y ejecución de las tareas | Falta de práctica en el ajuste |
| Maquinaria | Equipos, herramientas y mantenimiento | Herramienta desajustada |
| Materiales | Insumos y características de las piezas | Variación en el espesor |
| Medición | Instrumentos, criterios y registros | Instrumento sin verificar |
| Medio ambiente | Condiciones del lugar de trabajo | Iluminación insuficiente |

Puedes dejar grupos sin causas cuando no tengas información. Revisa las hipótesis con observaciones del proceso antes de proponer acciones.

## 5. Balanceo de líneas

### Objetivo

Proponer cómo repartir tareas entre estaciones respetando el orden de trabajo y el tiempo disponible para producir una pieza.

### Preparar los datos

1. Escribe el nombre del estudio.
2. En **Definir ciclo mediante**, elige Tiempo de ciclo o Demanda por jornada.
3. Introduce el tiempo disponible por jornada en minutos. Si conoces el ciclo, escribe los minutos por pieza. Si eliges demanda, escribe las piezas que se necesitan durante esa jornada.
4. En **Tareas y secuencia**, captura una clave única, el nombre y el tiempo en minutos de cada tarea.
5. En **Predecesoras**, escribe las claves de las tareas que deben terminar antes. Si hay varias, sepáralas con comas, por ejemplo A, B. Deja vacío cuando no haya predecesoras.
6. En **Incompatibles**, indica las claves de tareas que no deben compartir estación. Deja vacío si no existe esta restricción.
7. Usa **+ Agregar tarea** o **Eliminar** para ajustar la lista y pulsa **Calcular resultados**.

### Ejemplo de práctica

Selecciona Tiempo de ciclo, una jornada de **480 minutos** y un ciclo de **2 minutos por pieza**. Usa estas tareas, sin incompatibilidades:

| Clave | Tarea | Tiempo (min) | Predecesoras |
| --- | --- | --- | --- |
| A | Preparar pieza | 0.8 | Vacío |
| B | Ensamblar | 1.2 | A |
| C | Inspeccionar | 0.6 | B |
| D | Empacar | 0.7 | C |

El resultado esperado es **2 estaciones**: A y B en la primera; C y D en la segunda. La eficiencia es **82.5 %**. Este ejemplo sirve para comprobar que capturaste correctamente los datos.

### Entender el resultado

- **Estaciones propuestas:** grupos de tareas que sugiere el sistema.
- **Mínimo teórico:** límite calculado por la suma de los tiempos; las restricciones pueden impedir alcanzarlo.
- **Carga:** tiempo de trabajo asignado a cada estación.
- **Ocio:** tiempo disponible que queda sin asignar dentro del ciclo.
- **Eficiencia:** proporción del tiempo disponible de las estaciones que se ocupa en las tareas.

La propuesta utiliza una regla de asignación y no garantiza la mejor distribución posible. Revisa también espacio, seguridad y condiciones reales de trabajo. Para conservar el análisis, pulsa Guardar estudio; para compartir la tabla y la gráfica, usa Imprimir resultados después de calcular.

## 6. Hombre-Máquina

### Elegir la herramienta

| Herramienta | Cuándo usarla |
| --- | --- |
| Servicio sincrónico | Una persona atiende máquinas iguales en un orden fijo. |
| Servicio aleatorio | Las máquinas pueden pedir atención de forma independiente y hay uno o varios operadores. |
| Relaciones complejas | Se estudian tiempos medios de marcha, servicio y espera al compartir una persona. |

Escribe el nombre del estudio y elige el botón de la herramienta. Cada herramienta conserva sus propios campos dentro del estudio. Después de cambiar datos o de herramienta, pulsa **Calcular resultados** para actualizar el análisis.

### Servicio sincrónico

1. Introduce el **Número de máquinas**.
2. En **Carga y descarga L**, escribe el tiempo de atención manual por máquina, en minutos.
3. En **Tiempo automático M**, escribe el tiempo durante el que la máquina trabaja sin esa atención.
4. En **Trabajo externo y traslado W**, registra el trabajo externo y desplazamiento por atención, incluido el regreso correspondiente al recorrido.
5. Introduce los costos por hora si deseas comparar económicamente las asignaciones. Usa la misma moneda para persona y máquina. Puedes dejarlos en cero para estudiar tiempos.
6. Pulsa Calcular resultados y revisa producción, ocupación, esperas y cronograma.

Práctica: **3 máquinas, L = 1 min, M = 4 min y W = 0.2 min**. Debe aparecer un ciclo de **5 min**, producción de **36 piezas/h** y ocupación de la persona de **72 %**.

La tabla compara de 1 a 30 máquinas. Si todos los costos son cero, no se recomienda una alternativa por costo. La recomendación, cuando aparece, se limita a las opciones comparadas.

### Servicio aleatorio

1. Introduce las máquinas del grupo y los operadores disponibles. No uses más operadores que máquinas.
2. Escribe la probabilidad de requerir atención como un valor de **0 a 1**. Por ejemplo, 40 % se introduce como **0.4**, no como 40.
3. Introduce la duración de la jornada en horas y la producción nominal por máquina en piezas por hora.
4. Introduce los costos, si se conocen, y pulsa Calcular resultados.
5. Revisa las horas-máquina perdidas, producción ajustada y comparación de operadores.

La producción ajustada descuenta la espera por falta de operadores cuando coinciden solicitudes. No descuenta por separado averías, otras pérdidas ni el tiempo propio de servicio. Las horas-máquina perdidas suman las esperas de todas las máquinas, por lo que pueden superar la duración de una jornada.

### Relaciones complejas

1. Selecciona **Wright** para grupos de 7 o más máquinas, o **Interferencia de curva o medición** si tienes ese dato.
2. Captura las máquinas asignadas a una persona, el tiempo medio de marcha M y el tiempo medio de servicio L, ambos en minutos.
3. Si elegiste interferencia introducida, captura I según la curva o medición de tu estudio. Para menos de 7 máquinas no se aplica Wright; necesitas este dato de interferencia.
4. Introduce los costos, si procede, y pulsa Calcular resultados.
5. Revisa espera, ciclo medio, producción y ocupación. Son valores promedio; no representan un orden exacto de atención.

I se expresa como porcentaje del tiempo de servicio. **I = 100 % significa una espera igual a L**, no que la máquina espere toda la jornada. Por eso I puede superar 100 %. Si no conoces el dato, consulta al responsable; no lo sustituyas por el porcentaje de tiempo ocioso.

En cualquiera de las herramientas, usa Guardar estudio para conservar los datos y Cargar estudio para recuperarlos. Los archivos anteriores de Operador-Máquina son compatibles. Después de cargar, recalcula; puedes usar Imprimir resultados y elegir Guardar como PDF si tu navegador ofrece esa opción.

## 7. Preguntas frecuentes

**¿Debo crear una cuenta?** Esta versión no tiene registro de usuarios. Entras con el enlace proporcionado. Cada navegador conserva sus propios borradores.

**¿Puedo continuar en otro equipo?** Sí: descarga el archivo con Guardar estudio, llévalo al otro equipo y usa Cargar estudio en el mismo módulo y enlace del piloto.

**¿Por qué no aparece mi trabajo?** Comprueba que usas el mismo navegador y dirección. Busca el archivo que descargaste y cárgalo. El borrador de una dirección local no se transfiere automáticamente al enlace público.

**¿La página tarda mucho en abrir?** Espera alrededor de un minuto si es la primera visita tras un periodo de inactividad. Si sigue sin abrir, revisa internet y comunica el problema al responsable.

**¿Por qué no calcula?** Revisa los campos señalados y sus unidades. Los tiempos requeridos deben ser válidos, las claves de tareas únicas y las predecesoras deben existir. En Balanceo no puede haber ciclos como A depende de B y B depende de A.

**¿Qué hago si una tarea excede el ciclo?** Comprueba unidades y datos. Si el tiempo es correcto, revisa el objetivo de producción con el responsable; el sistema no divide automáticamente esa tarea.

**¿Por qué desaparecieron los resultados al editar?** Para evitar mostrar un cálculo anterior como si correspondiera a los datos nuevos. Pulsa Calcular resultados otra vez.

**¿Por qué no carga mi archivo?** Debe ser un .json descargado de ese mismo módulo. Un JPG o PDF no contiene el estudio editable. Si el archivo está dañado o pertenece a otro módulo, la aplicación lo rechaza sin sustituir el estudio abierto.

**¿Qué hago si dice que no puede guardar el borrador?** Pulsa Guardar estudio de inmediato y comprueba que se descargó el archivo. El navegador puede tener limitado su almacenamiento.

**¿Dónde está la descarga?** Revisa Descargas y el panel de descargas del navegador. Para imprimir, primero calcula; luego utiliza Imprimir resultados y elige impresora o PDF.

**¿Se puede usar sin internet?** Para las pruebas usa una conexión activa: los cálculos de Balanceo y Hombre-Máquina requieren el servidor. No se garantiza trabajo sin conexión.

**¿Todos ven mis estudios?** Los borradores no se sincronizan entre participantes. En un equipo compartido, otra persona que use el mismo perfil del navegador puede ver el borrador. Descarga tu trabajo y usa Nuevo al terminar si el responsable lo indica.

## 8. Al terminar la prueba

1. Revisa los datos, genera el diagrama o calcula los resultados.
2. Descarga el archivo editable con Guardar estudio.
3. Descarga el JPG de Ishikawa o guarda el resultado como PDF, si te lo pidieron.
4. Entrega los archivos por el medio acordado con el responsable. La aplicación no los envía por sí sola.
5. Si encontraste un problema, indica el módulo, dispositivo y navegador, los pasos que seguiste, qué esperabas y qué ocurrió. Adjunta una captura o el archivo de práctica si ayuda a reproducirlo, evitando datos personales innecesarios.

Conserva una copia de tus archivos hasta que el responsable confirme su recepción.
