# Plan de rediseño de Popol Vuh Escolar

**Fecha:** 27 de septiembre de 2026.  
**Estado:** implementación local del rediseño terminada el 28/09/2026. Verificación automatizada y visual completada en navegador; quedan pendientes dispositivos físicos, mediciones de rendimiento móvil y almacenamiento externo. Ver [informe](docs/VERIFICACION_REDISENO.md) y registro al final.  
**Prioridad:** experiencia en celulares y libro colectivo realista.  
**Decisión confirmada por el usuario:** cada pareja escribe los dos nombres y trabaja desde un mismo celular.
**Ampliación confirmada el 30/09/2026:** lectura del libro desde el inicio sin ingresar nombres. El ingreso de pareja se mantiene para crear y editar.

## 1. Resultado que buscamos

Transformar la app en un taller editorial escolar: cada pareja escribe, ilustra y narra un capítulo; al abrir el libro, toda la clase ve sus producciones convertidas en una edición cuidada, con portada, papel, páginas que responden al dedo y voces que se escuchan cómodamente.

La impresión debe venir de tres cosas a la vez: una dirección visual reconocible, un libro convincente y una experiencia móvil sin fricción. La lectura, la autoría de los alumnos y la conservación de su trabajo tienen prioridad sobre los efectos.

Este documento conserva la investigación inicial y registra la ejecución. Las casillas se completan únicamente cuando existe una entrega comprobada; las tareas parciales se desglosan. Las especificaciones visuales y presupuestos que siguen son objetivos de diseño, salvo las mediciones identificadas en el informe de verificación.

### Alcance acordado

- Mantener dos integrantes por equipo y el ingreso sencillo con nombres en un solo dispositivo.
- Mantener el flujo de elegir capítulo, agregar resumen, imagen y grabación, y leer el libro colectivo.
- Rediseñar ingreso, selección, editor, grabadora, lector y las pantallas docentes necesarias para mantener coherencia.
- Priorizar celulares, sin degradar computadoras, tabletas o proyección en clase.
- Conservar los contenidos existentes durante cualquier cambio de almacenamiento.
- Incorporar las mejoras de guardado, medios y navegación necesarias para que el rediseño sea fiable.

No forman parte de la primera versión: edición simultánea desde dos dispositivos, cuentas individuales, chat, generación automática de trabajos de alumnos, calificaciones, exportación PDF/EPUB, tienda, ni una PWA con funcionamiento completo sin conexión. Pueden evaluarse después. Desde el pedido del 30/09/2026, el libro admite visitantes sin sesión; publicar el alojamiento sigue siendo una tarea aparte.

## 2. Diagnóstico inicial del proyecto

### Base técnica verificada

El proyecto usa Next.js App Router, React, TypeScript, Tailwind CSS, componentes shadcn/Radix, Zustand y Prisma con PostgreSQL. Ya hay componentes separados para las pantallas principales y bibliotecas de animación/carrusel reutilizables.

| Tecnología | Declaración del proyecto | Versión instalada comprobada |
|---|---|---|
| Next.js | `^16.1.1` | `16.2.4` |
| React / React DOM | `^19.0.0` | `19.2.5` |
| Tailwind CSS | `^4` | `4.2.4` |
| Framer Motion | `^12.23.2` | `12.38.0` |
| Embla React | `^8.6.0` | `8.6.0` |

Existen `package-lock.json` y `bun.lock`; antes de instalar bibliotecas se debe identificar qué gestor usa el despliegue y fijar una fuente de versiones reproducible. No hace falta cambiar de framework para este rediseño.

### Problemas observados y efecto sobre el uso

Las referencias de esta tabla son relativas a la raíz del repositorio y corresponden al código revisado en esta fecha.

| Área | Evidencia | Efecto / respuesta del plan |
|---|---|---|
| Libro en celulares | `src/components/popol-vuh/BookViewer.tsx:174` mantiene altura mínima de 500 px; las dos páginas usan `w-1/2` desde la línea 177. | El espacio de lectura se divide incluso en un teléfono. Diseñar página única y dimensiones según el espacio disponible. |
| Giro de páginas | `BookViewer.tsx:129` y animaciones de `src/app/globals.css`. | Rotación rígida de 800 ms y actualización mediante temporizador; no hay arrastre progresivo ni cancelación. Sustituir por motor específico, sujeto a prueba. |
| Contenido largo | `BookViewer.tsx:61` aplica scroll dentro de la página. | Se pierde la sensación editorial y aparecen gestos competidores. Paginar el texto realmente y ofrecer lectura continua. |
| Contador | `BookViewer.tsx:105` cuenta capítulos como páginas y considera contenido cualquier texto o imagen. | Separar capítulo, página y avance; representar también un capítulo que solo tenga audio. |
| Navegación del libro | `BookViewer.tsx:261` crea puntos pequeños sin nombres accesibles. | Reemplazar por índice textual, contador y controles táctiles claros. |
| Audio del lector | `BookViewer.tsx:113` recrea el audio al volver a reproducir y no gestiona el rechazo de `play()`. | Reproductor único con pausa real, progreso y errores comprensibles. |
| Guardado | `src/components/popol-vuh/StageEditor.tsx:77` no verifica `res.ok` antes de mostrar «Guardado». | Corregir antes de utilizar la nueva edición con alumnos; un fallo no puede aparentar éxito. |
| Borradores | `StageEditor.tsx:14` conserva cambios en memoria; `src/lib/store.ts:46` solo persiste equipo y estado docente. | Recuperar trabajo tras volver o recargar; diferenciar borrador local de contenido guardado en servidor. |
| Medios pesados | `StageEditor.tsx:50` acepta imágenes de hasta 10 MB y las convierte a base64. `src/app/api/stages/route.ts:6` devuelve todos los campos. | La grilla recibe también los audios e imágenes completos. Separar metadatos y archivos; cargar medios cuando se necesitan. |
| Grabadora | `src/components/popol-vuh/AudioRecorder.tsx:15` solo toma el audio inicial al montar; faltan limpiezas completas al desmontar. | Revisar recuperación de audio, micrófono, temporizadores y URLs temporales al salir o interrumpir. |
| Acciones táctiles | Eliminar imagen depende del hover en `StageEditor.tsx:195`; varios botones base miden 32–36 px. | Acciones visibles y áreas táctiles de al menos 44 × 44 px como objetivo del producto. |
| Reserva de capítulo | `src/app/api/stages/[id]/claim/route.ts:17` lee y luego actualiza por separado. | Evitar que dos celulares obtengan el mismo capítulo con reserva atómica y mensaje de conflicto. |
| Equipo al reingresar | `src/app/api/groups/route.ts:24` siempre crea un grupo nuevo. | Continuar el equipo guardado en el dispositivo; no deducir identidad por igualdad de nombres. |
| Navegación general | `src/app/page.tsx:39` cambia vistas con Zustand. | El botón Atrás y la recarga no reflejan el recorrido. Dar URL a las pantallas principales. |

### Qué se comprobó y qué queda pendiente

- Se revisaron los componentes, estado, modelo de datos y rutas relevantes sin modificar contenidos de alumnos.
- Se abrió la pantalla de ingreso en navegador, en escritorio y con viewport de 390 × 844. Mostró el formulario esperado; no aparecieron errores ni advertencias en la consulta de consola de esa pantalla. La composición actual es oscura, muy centrada y con controles visualmente pequeños.
- El arranque normal con Turbopack falló por un problema del observador de archivos después de inferir una raíz superior al proyecto. Se pudo abrir el ingreso usando temporalmente `next dev --webpack`, sin cambiar la configuración. Registrar y resolver la raíz del proyecto en la fase 0.
- No se crearon equipos de prueba ni se escribieron datos en la base. El diagnóstico del libro, editor y grabadora se basa en el código; sus capturas y pruebas interactivas completas quedan en la fase 0 con datos aislados.
- No se han realizado mediciones de rendimiento ni pruebas en iPhone/Android físicos. La emulación de tamaño no demuestra compatibilidad del micrófono ni de los gestos reales.

## 3. Dirección visual: una edición colectiva contemporánea

### Concepto

**«El Popol Vuh, contado por nuestra clase».** Una identidad editorial cálida: fondo verde profundo para presentar la obra, superficies claras para trabajar y papel marfil para leer. Portada con relieve sugerido, lomo discreto y detalles de color maíz. Las ilustraciones y nombres de los alumnos deben sentirse parte de un libro terminado.

Usar recursos relacionados con el relato y la naturaleza con cuidado contextual. La ornamentación será sobria y contemporánea; no presentar símbolos inventados como glifos históricos auténticos. El contenido de los capítulos y sus atribuciones se conserva. Las imágenes de los alumnos mantienen protagonismo frente a cualquier ilustración decorativa.

### Sistema visual propuesto

| Elemento | Propuesta inicial | Aplicación |
|---|---|---|
| Fondo profundo | `#102B26` | Portada y entorno del libro; evitar grandes superficies de negro puro. |
| Papel | `#F6EEDC` | Hojas y superficies de lectura. |
| Tinta | `#26352E` | Texto sobre papel. |
| Jade | `#1B6B53` | Botones principales, enlaces y avance. |
| Maíz / dorado | `#C79B48` | Filetes, detalles de tapa e indicadores; no usar como texto pequeño sin comprobar contraste. |
| Terracota | `#A6533C` | Acento secundario y estados específicos con icono y texto. |
| Tipografía de lectura | Una serif editorial; candidata: Source Serif 4. | Títulos del libro y resumen, con tildes y caracteres del material correctamente resueltos. |
| Tipografía de interfaz | Conservar Geist Sans. | Formularios, navegación, etiquetas y controles. |
| Espaciado | Escala de 4, 8, 12, 16, 24, 32 y 48 px. | Ritmo consistente; márgenes de página que se adapten al ancho. |
| Formas | Tarjetas suaves; hojas con esquinas casi rectas. | Evitar que cada página parezca una tarjeta de aplicación. |

La paleta es una propuesta; verificar las combinaciones finales antes de darlas por válidas. Cargar fuentes con `next/font`, limitar variantes y esperar su carga para medir páginas. La documentación oficial describe la integración y el alojamiento de fuentes desde la aplicación. [Fuente: Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts).

### Detalles que deben producir el efecto de calidad

- Portada con título protagonista, subtítulo «Una creación de nuestra clase» y un ornamento ligero propio; apertura corta, omisible y ligada al gesto de abrir.
- Sombra de contacto bajo el libro, canto de hojas y sombreado del pliegue que cambie durante el giro.
- Papel con textura muy sutil. Generarla con CSS o un recurso pequeño, sin reducir contraste ni repetir manchas evidentes.
- Capítulos con número, título, autores, ilustración bien encuadrada y texto aireado. Evitar justificar texto en columnas estrechas.
- Estados de éxito discretos, transiciones breves y carga con estructura estable. El contenido no debe saltar al aparecer una imagen.
- Sin música automática ni sonidos obligatorios al pasar hojas. Los efectos sonoros quedan fuera de la primera versión.

### Recursos visuales a producir durante la ejecución

Crear una portada original, un ornamento sencillo, una textura ligera si CSS no basta y estados vacíos coherentes. Registrar fuente, autor y licencia de cualquier recurso externo en `docs/ASSETS.md`. Para recursos generados, guardar también el propósito y la descripción usada. No descargar conjuntos grandes de imágenes ni introducir servicios pagos para lograr esta estética.

## 4. Diseño de la experiencia completa

### 4.1 Ingreso de la pareja

- Portada atractiva, una frase que explique la actividad y un formulario corto de dos nombres.
- Campos con etiquetas permanentes, tamaño de texto mínimo de 16 px y autocompletado apropiado; errores junto al campo y al envío cuando corresponda.
- Acción «Comenzar nuestro capítulo»; si existe una sesión válida, mostrar «Continuar con [nombres]» y acceso a cambiar de equipo.
- Acceso docente visible pero secundario.
- En celulares bajos o con teclado abierto, el formulario puede desplazarse; no mantener un centrado vertical que esconda acciones.
- Conservar el equipo mediante sesión válida. Al salir se comunica si hay borrador pendiente; compartir un teléfono entre equipos no debe mezclar borradores.

**Recuperación entre dispositivos:** no es parte del ingreso básico confirmado. Si el equipo necesita recuperar acceso tras borrar datos o cambiar de teléfono, prever código de recuperación administrado por docente; no reutilizar una pareja solo porque coinciden sus nombres.

### 4.2 Selección de capítulo

- Encabezado con nombres del equipo y acceso claro a «Abrir el libro de la clase».
- Si ya hay capítulo asignado, tarjeta principal «Nuestro capítulo» con acción «Continuar».
- Tarjetas numeradas con título legible y estados «Disponible», «En edición» y «Con aportes»; texto, imagen y audio tienen indicadores separados.
- Una columna en teléfonos estrechos, dos cuando el contenido cabe y una grilla más amplia en escritorio.
- Mientras se reserva un capítulo, bloquear envíos duplicados. Si otro equipo lo tomó, actualizar disponibilidad y explicar lo ocurrido.
- Nunca mostrar un listado vacío como consecuencia silenciosa de un error: ofrecer estado de carga, error y reintento.

### 4.3 Editor: escribir, ilustrar, narrar

Presentar tres secciones reconocibles, con acceso directo a cualquiera. No obligar a completar un asistente secuencial si la pareja quiere empezar por la imagen.

| Sección | Experiencia prevista |
|---|---|
| Escribir | Consigna del capítulo, campo cómodo, contador orientativo y vista previa. Sugerir un resumen breve sin cortar textos existentes ni imponer un límite nuevo sin decisión pedagógica. |
| Ilustrar | Elegir archivo desde cámara/galería según capacidades del dispositivo, vista previa, reemplazo y eliminación visibles. Encuadre opcional y descripción alternativa editable. |
| Narrar | Texto del equipo visible durante la grabación, botón grande, tiempo transcurrido, estado del micrófono y opción de escuchar antes de guardar. |
| Revisar | Resumen de los tres aportes y acceso a «Ver nuestro capítulo en el libro». Indicar qué falta sin impedir guardar trabajo parcial. |

Barra de acciones accesible con «Guardar» y estado persistente: «Cambios sin guardar», «Guardando…», «Guardado» o «Sin conexión: borrador en este dispositivo». Guardar medios muestra progreso; un texto local no se presenta como enviado al servidor.

El borrador local se recupera por equipo y capítulo. Para texto bastan datos pequeños; para imágenes y audio usar blobs en IndexedDB, con manejo de cuota y limpieza de versiones antiguas. No prometer protección de una grabación que el sistema interrumpió antes de obtener sus datos.

### 4.4 Docente

Mantener las acciones existentes, con la misma tipografía, estados y criterios táctiles. En móvil, transformar tablas densas en tarjetas o filas expandibles. Mostrar avance por capítulo y acceso al libro. Las acciones que reemplazan o eliminan trabajos requieren una interacción clara y contextual, con recuperación cuando el modelo la permita.

## 5. Especificación del nuevo libro

### 5.1 Formato adaptable

**Celular vertical:** una página completa, con texto a tamaño legible. La hoja utiliza casi todo el ancho y los controles quedan fuera del área de giro. No se encoge un libro de escritorio para hacerlo entrar.

**Tableta/escritorio:** doble página si ambas conservan ancho y alto suficientes. Como punto de partida, exigir al menos 380 px útiles de ancho por hoja y unos 480 px de altura; ajustar después de probar títulos largos y el tamaño de letra. La decisión se toma por dimensiones del contenedor, no por identificar el dispositivo.

**Celular horizontal o ventana baja:** página única con controles compactos; si no queda altura legible, ofrecer lectura continua. No forzar rotación ni pantalla completa.

```text
CELULAR                              PANTALLA AMPLIA
┌───────────────────────────┐        ┌─────────────────────────────────────┐
│ Volver   Nuestro libro  ≡ │        │ Volver    Libro de la clase   Índice │
├───────────────────────────┤        ├─────────────────────────────────────┤
│                           │        │ ┌────────────────┬────────────────┐ │
│     UNA HOJA LEGIBLE      │        │ │ Número / título│                │ │
│  Título, autores y texto  │        │ │ Autores        │  Ilustración   │ │
│      o ilustración        │        │ │ Texto          │                │ │
│                           │        │ └────────────────┴────────────────┘ │
├───────────────────────────┤        │     Escuchar capítulo  ▷  0:00      │
│ ▷ Escuchar       0:00     │        │ Anterior   Páginas 6–7   Siguiente  │
│ ‹   Página 6 de 32    ›   │        └─────────────────────────────────────┘
└───────────────────────────┘
```

El esquema muestra jerarquía, no una composición fija de dos páginas por capítulo. Los capítulos largos pueden ocupar más hojas.

### 5.2 Estructura editorial y modelo de páginas

Construir un `BookPage[]` separado de los registros `Stage`. Una página representa una cara visible; una hoja física tiene anverso y reverso. El capítulo puede abarcar varias páginas.

Tipos previstos: portada, portadilla, índice, apertura de capítulo, texto/continuación, ilustración, créditos y contraportada. El índice superpuesto de la interfaz siempre estará disponible aunque se reduzcan las páginas preliminares por espacio.

Cada descriptor incluye un identificador estable, tipo, capítulo si corresponde, fragmento de contenido, referencia al medio y ancla semántica. Para texto, el ancla usa capítulo y posición en el texto original; para imágenes, capítulo y referencia de ilustración. La secuencia visual y los números de página se calculan para cada composición.

Reglas editoriales:

- Ordenar por número de capítulo; conservar títulos y nombres del equipo.
- Incluir capítulos con algún aporte guardado de texto, imagen o audio. Si están incompletos, indicarlo de forma discreta. No convertir automáticamente «con aportes» en «terminado».
- Los capítulos totalmente vacíos aparecen como pendientes en el índice general de la clase, sin insertar múltiples hojas vacías en el libro.
- Portada cerrada y apertura deben respetar la dirección de lectura; en doble página, el avance gira la hoja derecha hacia la izquierda y el retroceso hace lo inverso.
- Definir explícitamente el mapeo entre páginas editoriales e índices del motor, incluyendo tapa, reversos y posibles páginas de cortesía. Probar cantidades pares e impares y libros de un solo capítulo.
- No forzar que cada capítulo tenga exactamente dos páginas ni rellenar con páginas vacías para sostener esa suposición.
- Diferenciar «Capítulo 3 de 12» de «Página 8 de 35». Los números de página pueden cambiar al modificar letra o orientación.

### 5.3 Paginación del texto

1. Medir el espacio disponible después de cargar fuentes y reservar cabecera, márgenes y folio.
2. Componer bloques de texto en un contenedor de medición con la misma tipografía y ancho que la hoja final.
3. Cortar preferentemente entre párrafos; si un párrafo no entra, dividir entre palabras con búsqueda del punto de corte que realmente cabe.
4. Mantener el texto original íntegro: no perder, repetir ni reordenar palabras. Preservar saltos significativos, tildes y signos. Manejar palabras largas y enlaces con ajuste de línea.
5. Evitar títulos aislados al pie de página y líneas huérfanas cuando el espacio lo permita.
6. Reservar una página de ilustración cuando haga falta; usar `object-fit: contain` para no cortar dibujos. Un recorte ornamental nunca sustituye al original.
7. Recalcular al cambiar ancho, altura estable, tamaño de letra o contenido. Conservar el ancla de lectura, no un índice numérico que dejó de significar lo mismo.
8. Posponer repaginación mientras se arrastra una hoja; completarla al quedar el motor en reposo. Evitar bucles de `ResizeObserver`.
9. Guardar resultados en una caché acotada según versión de contenido, tipografía y dimensiones. Las páginas derivadas no se guardan como nuevos capítulos en la base.

Cambios breves de las barras del navegador no deben recomponer todo el libro continuamente: usar una altura de lectura estable y actualizar ante un cambio real de orientación/tamaño. Si una combinación de zoom o contenido impide paginar bien, mantener disponible el texto íntegro en lectura continua.

### 5.4 Giro y gestos

- El arrastre horizontal debe seguir el dedo, mostrar pliegue y sombra, y permitir completar o cancelar el giro al soltar.
- Toques sobre controles, texto seleccionable o ilustraciones ampliables no provocan giros accidentales.
- Botones «Anterior» y «Siguiente» siempre disponibles; el gesto es una alternativa, nunca un requisito.
- Con teclado: flechas cuando el lector tiene foco y el usuario no está editando un campo; Escape cierra índice o ampliación.
- Un índice permite saltar directamente a un capítulo. No animar veinte giros para alcanzar una selección lejana.
- Estado explícito del motor: preparando, listo, arrastrando, animando y recomponiendo. Mientras anima, evitar comandos simultáneos; conservar como máximo una intención siguiente si las pruebas justifican esa interacción.
- El cambio definitivo de página se confirma con eventos reales del motor. No usar un `setTimeout(800)` como fuente de verdad.
- Animación automática inicial orientativa de 450–650 ms, ajustable tras probar celulares. El gesto directo conserva su respuesta propia.
- Con movimiento reducido, eliminar el giro tridimensional y mostrar cambio inmediato o transición muy breve, manteniendo las mismas funciones.

### 5.5 Audio del capítulo

Un solo elemento de audio y su estado viven fuera de las hojas animadas. Esto evita reproductores duplicados durante los giros.

- Reproducir, pausar, reanudar, mostrar duración/progreso y permitir buscar dentro de la lectura.
- Mantener la reproducción al pasar entre páginas del mismo capítulo.
- Al entrar en otro capítulo, pausar y mostrar su audio disponible. No iniciar automáticamente la voz siguiente.
- En un pliego con páginas de capítulos distintos, indicar explícitamente el capítulo del reproductor; la página de destino del avance o la elegida en el índice define la selección. Permitir seleccionar el otro capítulo visible.
- Al cerrar el libro, detener el audio. Al reabrir, recuperar posición de lectura; la voz comienza solo por acción del usuario.
- Gestionar carga, rechazo de reproducción, archivo ausente y fin de pista. La interfaz no muestra «reproduciendo» antes de que `play()` tenga éxito.
- Un fallo del audio no impide leer ni pasar hojas.

### 5.6 Índice, lectura continua y memoria de lectura

Índice en panel inferior móvil y panel lateral/diálogo amplio en escritorio: número, título, autores y disponibilidad de audio. Al elegir una entrada, cerrar el panel, mover el foco correctamente y abrir el capítulo.

Ofrecer «Libro» y «Lectura continua». La segunda vista utiliza HTML semántico, texto seleccionable, zoom y navegación por capítulos. Sirve para accesibilidad, ventanas pequeñas y recuperación si falla el motor. Se conserva el mismo contenido y la misma ancla entre modos.

Recordar localmente último capítulo, ancla y tamaño de texto junto con la versión del contenido. Al recargar con una versión nueva, buscar el ancla más cercana; si el capítulo fue retirado, volver al índice con explicación. No prometer una página física inmutable entre dispositivos.

## 6. Bibliotecas y decisión técnica

### Comparación investigada

| Opción | Aporte | Riesgo y decisión |
|---|---|---|
| **StPageFlip / `page-flip` directo** | Motor especializado: páginas HTML, pliegue, sombras, tapa rígida y modos de una/dos páginas. Licencia MIT. | Candidato principal para una prueba técnica aislada. El repositorio consultado muestra versión 2.0.7 y actividad antigua; no tratarlo como integración ya garantizada. [Repositorio](https://github.com/Nodlik/StPageFlip), [paquete](https://github.com/Nodlik/StPageFlip/blob/master/package.json), [historial](https://github.com/Nodlik/StPageFlip/commits/master/). |
| **`react-pageflip`** | Envoltorio React del mismo motor; reduce código inicial de integración. MIT. | El paquete observado es 2.0.3, usa React 17 en desarrollo y declara `page-flip: latest`. No hay validación suficiente de React 19 para adoptarlo sin prueba. Preferir un adaptador pequeño propio. [Paquete](https://github.com/Nodlik/react-pageflip/blob/master/package.json), [implementación](https://raw.githubusercontent.com/Nodlik/react-pageflip/master/src/html-flip-book/index.tsx). |
| **Motion + CSS** | Ya instalado; útil para portada, paneles y pequeñas transiciones. La documentación actual contempla React y Next.js. | No aporta un motor editorial ni una simulación completa de hoja. Desarrollar el pliegue desde cero amplía mucho el trabajo. Usarlo alrededor del libro. [Instalación](https://motion.dev/docs/react-installation), [accesibilidad](https://motion.dev/docs/react-accessibility). |
| **Embla 8.6.0** | Ya instalado; alternativa de desplazamiento sencilla y táctil. MIT. | Candidato para modo ligero si aporta valor; un carrusel no alcanza por sí solo la meta de libro realista. Mantener documentación de la versión 8 y evitar migrar a una versión preliminar sin necesidad. [Documentación v8](https://www.embla-carousel.com/docs/v8), [versiones](https://github.com/davidjerleke/embla-carousel/releases). |

Las versiones externas anteriores provienen de repositorios oficiales consultados el 27/09/2026; no equivalen a una comprobación de la última publicación en npm. Revalidar versiones y licencias al ejecutar la prueba y fijar la elegida en el archivo de dependencias.

### Decisión propuesta y condición para adoptarla

**Probar `page-flip` directo, detrás de un adaptador cliente desacoplado.** Se adopta solo si supera la fase 1. La recomendación se basa en las necesidades de este proyecto; no es una garantía del proveedor.

Riesgos concretos que el prototipo debe resolver:

- El motor hace copias temporales de HTML. No alojar estado de audio o controles complejos dentro de esas copias; evitar IDs duplicados, foco sobre hojas ocultas y contenido repetido para lectores de pantalla. [Código de copias de HTML](https://raw.githubusercontent.com/Nodlik/StPageFlip/master/src/Page/HTMLPage.ts).
- La opción `mobileScrollSupport` requiere validación en dispositivos. No fijarla por su nombre: el código maneja `preventDefault` de distinta forma según estado y configuración. Probar también iconos dentro de botones y las esquinas al desactivar el giro por clic. [Código de gestos](https://raw.githubusercontent.com/Nodlik/StPageFlip/master/src/UI/UI.ts).
- React y el motor no deben competir por modificar los mismos nodos. Definir propiedad del contenedor, actualizaciones controladas y limpieza completa al desmontar. Probar montaje/desmontaje repetido y Strict Mode.
- La reducción de movimiento de Motion no desactiva automáticamente el motor externo; el adaptador debe cambiar el modo explícitamente.

**Si falla el prototipo:** registrar el caso reproducible y evaluar si una corrección pequeña del adaptador lo resuelve. Si no, mantener la lectura funcional y comparar un segundo motor antes de prometer el realismo. Un modo ligero con Embla/CSS puede permitir continuar el trabajo, pero no cierra el requisito visual por sí solo. Evitar una reescritura improvisada de física de papel o incorporar WebGL por defecto.

## 7. Reglas móviles y de accesibilidad

| Tema | Especificación de implementación |
|---|---|
| Ancho | Soporte desde 320 px; prioridad visual en 360, 390 y 430 px. Sin scroll horizontal de la pantalla. |
| Altura | Usar unidades modernas de viewport y altura estable para el libro; contemplar barras del navegador. Reservar espacio real para controles. |
| Safe areas | Márgenes con `env(safe-area-inset-*)` en barras superiores/inferiores; verificar que la barra del sistema no tape acciones. |
| Teclado | Al editar, permitir desplazamiento natural y comprobar el viewport visual. `dvh` por sí solo no resuelve todos los teclados. |
| Texto | Controles y cuerpo principal desde 16 px; lectura preferentemente 17–20 px, interlineado 1,5–1,7. No reducir letra para forzar que el resumen entre. |
| Tacto | Objetivo de producto ≥44 × 44 px en acciones; separación suficiente y estado presionado. Sin acciones exclusivas de hover. |
| Contraste | Objetivo AA: 4,5:1 para texto normal y 3:1 donde corresponda a texto grande/controles. Medir combinaciones finales. |
| Gestos | Distinguir desplazamiento vertical, giro horizontal y selección. No bloquear zoom del navegador ni aplicar `touch-action: none` a toda la app. |
| Accesibilidad | Encabezados, labels, nombres de botones, foco visible y regreso de foco al cerrar paneles. Informar cambios de página sin anunciar cada cuadro de animación. |
| Movimiento | Respetar `prefers-reduced-motion`; desactivar animaciones decorativas continuas. |
| Zoom | Probar texto al 200 % y lectura continua/reflujo a 320 CSS px; todas las funciones siguen disponibles. |
| Pantalla completa | Mejora opcional por detección de capacidades; la lectura normal debe ser suficiente. |

Los 44 px son una meta de comodidad de esta app. WCAG 2.2 AA establece un mínimo de 24 × 24 CSS px con excepciones, y exige una alternativa a ciertas acciones de arrastre; no confundir esos mínimos con la decisión de diseño. [Tamaño de objetivos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [movimientos de arrastre](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Para el tratamiento de barras móviles, considerar las diferencias entre `svh`, `lvh` y `dvh`. [Unidades de viewport](https://web.dev/blog/viewport-units).

## 8. Medios, guardado y rendimiento

### 8.1 Imágenes

- Conservar una fuente de calidad adecuada; generar miniatura para tarjetas y variantes para páginas móvil/escritorio.
- Punto de partida: miniaturas de 320–480 px, imágenes de lectura de 960–1600 px en su lado mayor. Ajustar por nitidez real de dibujos y textos fotografiados.
- Objetivo orientativo de imagen de lectura: 150–300 KB cuando la calidad lo permita; no degradar un trabajo para cumplir un número arbitrario.
- Corregir orientación de fotografías, validar tipo/tamaño y detectar archivos no decodificables. No asumir que todo archivo de galería es JPEG; contemplar HEIC mediante conversión soportada o un mensaje de formato con alternativa.
- Servir dimensiones conocidas, `sizes` y carga diferida. Usar `next/image` donde el origen y procesamiento lo permitan; un data URL legado no se vuelve ligero solo por cambiar el componente.
- En el libro, preparar imagen actual y próximas páginas; no descargar ni decodificar todas a máxima resolución al entrar.

### 8.2 Grabación y reproducción

Detectar `MediaRecorder` y formatos con `MediaRecorder.isTypeSupported()`, conservar el MIME efectivo y gestionar errores aunque el navegador anuncie soporte. El micrófono requiere un contexto seguro y permiso del usuario; probar el teléfono por HTTPS, no asumir que acceder a una IP local por HTTP reproduce las condiciones de `localhost`. [Formatos](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Estados de grabadora: disponible, solicitando permiso, preparando, grabando, procesando, lista y error. No reemplazar una grabación válida hasta confirmar que la nueva se produjo correctamente. Corregir la sincronización del audio guardado al reabrir el capítulo.

Liberar pistas del micrófono, listeners, temporizadores y object URLs al terminar, cambiar capítulo, salir o fallar. Mostrar qué ocurrió si el sistema interrumpe la grabación. Un límite inicial sugerido de 5 minutos se evaluará con la duración pedagógica real; no truncar archivos existentes. Si no hay grabación compatible, permitir cargar un archivo de audio válido.

Usar un elemento nativo de audio con interfaz accesible; no agregar una biblioteca de ondas hasta justificar su aporte. Una onda visual opcional puede usarse para comprobar volumen al grabar, sin recalcular animaciones costosas todo el tiempo.

### 8.3 Contrato de datos y migración compatible

Separar tres necesidades: listado ligero de capítulos, detalle editable de un capítulo y manifiesto del libro con referencias a sus contenidos. Definir contratos tipados y validar respuestas; no distribuir objetos grandes indistintamente entre todas las pantallas.

Campos nuevos posibles: referencias de imagen/audio, MIME, duración, dimensiones, texto alternativo y versión de edición. La selección del almacenamiento de objetos depende del alojamiento actual, que no se ha verificado. La fase de medios debe concretar proveedor, límites y coste antes de implementar; no guardar archivos en disco efímero de un despliegue serverless.

Secuencia de migración:

1. Preparar copia recuperable y entorno de prueba; inventariar formatos y tamaños sin exponer datos personales.
2. Agregar campos opcionales y un adaptador que lea tanto URLs nuevas como base64 existente.
3. Subir nuevos medios como archivos y guardar referencias; evitar reenviar el audio completo al cambiar solo el texto.
4. Migrar datos existentes por lotes con script repetible, registro de resultados y comprobación de lectura.
5. Mantener temporalmente los campos antiguos para volver atrás. Eliminar datos legados solo en una tarea posterior y deliberada.

Aunque se mantenga base64 al principio, el listado debe poder omitirlo y el lector cargar el detalle necesario. La mejora visual del libro puede desarrollarse con fixtures sin esperar toda la migración.

### 8.4 Guardado, conflictos y actualización colectiva

- Verificar código HTTP y respuesta antes de mostrar éxito.
- Conservar borrador y ofrecer reintento tras desconexión, 400, 409 o 500.
- Guardar una versión o `updatedAt` esperado para detectar cambios concurrentes y evitar sobrescribir una edición docente sin aviso.
- Reserva de capítulo atómica y regla de un capítulo por equipo validada en servidor, si se mantiene la regla actual de la interfaz.
- Actualizar datos al abrir el libro o regresar a la selección. Durante la lectura, si llegan nuevos aportes, mostrar «Hay una versión nueva» y aplicarla en reposo conservando el ancla.
- No insertar páginas a mitad de un giro ni iniciar sondeos constantes que vuelvan a descargar medios completos. Tiempo real mediante WebSockets no es necesario para la primera entrega.

### 8.5 Presupuestos y medición

Objetivos internos a validar sobre una compilación de producción y datos representativos:

| Medida | Objetivo inicial | Cómo comprobar |
|---|---|---|
| Carga de inicio | LCP ≤2,5 s y CLS ≤0,1 en el escenario móvil acordado. | Registrar dispositivo/perfil de red, 3 ejecuciones y mediana; no equiparar laboratorio con percentil de usuarios reales. |
| Respuesta a interacción | INP ≤200 ms como meta cuando haya medición de uso; evaluar tareas largas durante pruebas. | Herramientas de rendimiento y, si se habilita después, métricas de campo sin contenido de alumnos. |
| Giro | Apuntar a 60 fps en un Android de gama media de referencia. | Perfilar giros, cancelaciones y audio; documentar tirones y dispositivo, sin prometer igualdad universal. |
| Primera visita al listado | Ningún audio completo ni imágenes originales en la respuesta de metadatos. | Inspección de solicitudes y tamaños. |
| Audio | Archivo solicitado al reproducir o preparar expresamente el capítulo, sin precargar todas las pistas. | Red y memoria del navegador. |
| JavaScript | Motor del libro fuera de la carga inicial del ingreso/editor. | Revisar chunks y carga diferida; fijar presupuesto numérico con la línea base. |
| Memoria | Sin crecimiento acumulativo por abrir/cerrar el libro o la grabadora repetidamente. | Perfil de recursos, listeners y elementos de audio antes/después. |

Usar importación dinámica de las partes pesadas del lector desde un límite cliente adecuado. [Guía oficial de carga diferida de Next.js](https://nextjs.org/docs/app/guides/lazy-loading). Mantener las hojas ligeras; no asumir que el motor permite virtualizar arbitrariamente páginas HTML sin romper el giro. Primero medir cantidad de nodos y medios; introducir ventanas de páginas solo si el prototipo valida esa capacidad.

## 9. Arquitectura de implementación

Mantener las piezas actuales mientras se extraen responsabilidades. Nombres sugeridos, ajustables durante la ejecución:

```text
src/components/popol-vuh/
  LandingPage.tsx             # Ingreso renovado
  StageSelection.tsx          # Capítulos y avance
  StageEditor.tsx             # Taller de creación
  AudioRecorder.tsx           # Grabación compatible y recuperable
  BookViewer.tsx              # Entrada al lector / carga diferida
  book/
    BookReader.tsx            # Coordina contenido, posición y modo
    FlipBookAdapter.tsx       # Aísla el motor y su ciclo de vida
    BookCover.tsx
    BookPage.tsx              # Página editorial, sin reproductor propio
    BookControls.tsx
    BookContents.tsx
    ChapterAudioPlayer.tsx
    ContinuousReader.tsx
src/lib/book/
  types.ts                     # Página, ancla, capítulo y estado
  build-book.ts                # Secuencia editorial
  paginate.ts                  # Medición y fragmentación
  reading-position.ts
src/hooks/
  use-book-layout.ts
  use-chapter-audio.ts
  use-stage-draft.ts
```

Zustand conserva lo compartido; la posición transitoria del dedo y cada cuadro de animación no deben actualizar el estado global. El motor recibe páginas preparadas y devuelve eventos; desconoce las reglas de equipos o guardado.

Se implementaron `/`, `/capitulos`, `/capitulos/[id]/editar`, `/libro`, `/docente` y `/docente/ingresar`. El historial del navegador refleja la pantalla; la sesión se comprueba en servidor y el editor carga el detalle por su URL. Los borradores se conservan por equipo y capítulo. Los hooks previstos arriba se integraron en los componentes y módulos de borradores, sin crear archivos vacíos.

### Integridad necesaria para utilizar la nueva versión

La revisión detectó que la edición de capítulos no verifica el equipo en servidor y que el acceso docente se apoya en una comprobación del cliente y un booleano persistido. Son hallazgos concretos, no una ampliación hacia un sistema complejo de cuentas.

Antes de habilitar nuevas cargas de archivos y distribuir la versión renovada, usar sesiones verificadas por servidor, vincular cambios al equipo y proteger acciones docentes. Mantener el ingreso con dos nombres confirmado; la sesión técnica puede emitirse al ingresar. No confiar en `isAdmin` de localStorage ni en un `groupId` enviado por el cliente como autorización. La lectura del libro, sus ilustraciones y sus audios se habilitó para visitantes por el pedido explícito del 30/09/2026.

## 10. Ejecución por fases

Orden recomendado: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. La fase 2 puede avanzar en paralelo con la prueba del motor; las tareas de integridad de la fase 6 pueden adelantarse. El prototipo del libro debe llegar temprano para reducir el principal riesgo técnico.

Los tamaños son relativos: S = acotado; M = varios componentes; L = integración delicada. No son promesas de duración.

### Fase 0 — Preparación y línea base · M

**Objetivo:** poder comparar y probar sin tocar trabajos reales.

- [x] Identificar entorno local Windows, Next 16.2.4 y npm; usar `package-lock.json` para esta implementación. El alojamiento final no fue proporcionado.
- [x] Corregir la raíz de Next/Turbopack dentro del proyecto, sin borrar lockfiles ajenos.
- [x] Preparar demo aislada en memoria con ocho capítulos, aportes parciales y completos; agregar fixtures y pruebas de texto extenso, Unicode, solo audio e imágenes proporcionales.
- [ ] Capturar ingreso, grilla, editor y lector actuales a 390 px y escritorio; registrar limitaciones reales.
  - Se observó el ingreso anterior y se documentó el código previo; no existe un juego completo de capturas del antes. Las capturas de entrega corresponden a la nueva versión.
- [x] Registrar errores iniciales de tipos y comprobar contratos ligeros y empaquetado de producción.
- [ ] Medir tiempos iniciales comparables del lector anterior y del nuevo sobre el mismo teléfono/red.
- [x] Documentar problemas previos y restaurar verificación explícita de tipos en build.

**Entrega:** `docs/BASELINE_REDISENO.md` con capturas y mediciones reproducibles.  
**Salida:** el flujo se puede ensayar con datos de prueba y existen evidencias del estado inicial.

### Fase 1 — Prueba del motor y paginación · L

**Depende de:** fase 0. **Objetivo:** confirmar que la base del libro satisface móviles antes de decorarla.

- [x] Fijar `page-flip` 2.0.7 (MIT) e integrar un adaptador cliente.
- [x] Implementar tapa centrada, reversos, página móvil y pliego amplio proporcionado a la altura disponible.
- [x] Componer capítulos mediante medición real del DOM, con fuentes locales cargadas.
- [x] Mantener un único reproductor fuera de las hojas; verificar reproducción y pausa.
- [x] Verificar arrastre completo e incompleto, retroceso, índice, 20 giros y cambios de tamaño en navegador.
- [x] Incorporar hojas estáticas con movimiento reducido y lectura continua automática cuando falta altura.
- [ ] Verificar movimiento reducido del sistema, rotación y cancelación por interrupción en dispositivos físicos.
- [x] Revisar propiedad del DOM, hojas ocultas, eventos, Strict Mode y cancelación del bucle de animación al desmontar; agregar prueba de limpieza.
- [ ] Evaluar Safari iOS y Chrome Android físicos cuando estén disponibles; registrar como pendiente si falta un dispositivo.

**Entrega:** prototipo local con fixtures y `docs/DECISION_MOTOR_LIBRO.md`, con configuración, versión, pruebas y limitaciones.  
**Salida:** no hay bloqueos de lectura, páginas desordenadas, texto perdido ni controles que activen giros accidentales. Si el realismo no alcanza, decidir alternativa aquí.

### Fase 2 — Sistema visual y composiciones · M

**Depende de:** diagnóstico de fase 0; puede avanzar junto a fase 1.

- [x] Definir identidad editorial con crema, verde bosque, oro, Source Serif 4 y Geist locales.
- [x] Crear portada, papel, cantos, monograma y ornamento de maíz originales mediante CSS/SVG.
- [x] Implementar ingreso, listado, editor, docente y libro adaptables; guardar capturas móviles y de escritorio.
- [x] Verificar ausencia de desborde en siete tamaños; controles principales del libro de al menos 44 px.
- [ ] Completar auditoría de contraste, zoom al 200 % y nombres de longitud máxima en todo el recorrido.
- [x] Registrar recursos y licencias en `docs/ASSETS.md`.

**Entrega:** componentes visuales reutilizables y capturas de las cuatro pantallas.  
**Salida:** la aplicación tiene una identidad editorial consistente y la página móvil se lee sin zoom.

### Fase 3 — Libro completo · L

**Depende de:** fases 1 y 2.

- [x] Implementar modelo editorial, orden de capítulos, anversos/reversos y contador de páginas reales.
- [x] Integrar portada, índice completo, autores, texto, ilustraciones sin recorte, continuaciones y cierre.
- [x] Implementar botones, gestos, audio único, tres tamaños de texto y lectura continua.
- [x] Conservar ancla del pasaje al repaginar y recargar; probar cambio móvil/escritorio y tamaño de letra.
- [x] Implementar estados vacío, parcial, solo audio, fallo de medios y aviso de nuevos aportes; cubrir contenido parcial/solo audio con pruebas.
- [ ] Completar pruebas visuales de todos los estados de error y actualización concurrente durante un giro.
- [x] Cargar motor y medios de forma diferida; ocultar copias del motor a tecnologías de asistencia y proporcionar lectura con reflujo.
- [x] Retirar las animaciones y temporizadores del lector anterior.

**Entrega:** primer hito visible, **libro colectivo nuevo y utilizable en celular**.  
**Salida:** se puede recorrer todo el contenido, escuchar y regresar sin perder posición; no hay texto cortado ni giros duplicados.

### Fase 4 — Ingreso, capítulos y navegación móvil · M

**Depende de:** fase 2; reutiliza el lector de fase 3.

- [x] Rediseñar ingreso con dos nombres y continuación de sesión en el mismo dispositivo.
- [x] Construir tarjetas, progreso de texto/imagen/voz y acceso al libro.
- [x] Implementar carga, error y conflicto de reserva; verificar carrera de dos equipos en demo.
- [x] Dar URL a las pantallas y verificar vuelta al listado, recarga y apertura directa del editor.
- [ ] Completar matriz de Atrás/Adelante del navegador en Safari/Chrome físicos.
- [x] Renovar acceso y panel docente con la misma identidad visual.

**Entrega:** recorrido de entrada a creación/lectura coherente.  
**Salida:** desde un celular se distingue inmediatamente qué equipo entró, qué puede editar y cómo abrir el libro.

### Fase 5 — Editor, borradores y audio móvil · L

**Depende de:** fases 2 y 4. Adelantar la corrección de falso «Guardado» cuando se empiece a implementar.

- [x] Comprobar estado HTTP y versión antes de confirmar guardado; conservar el borrador ante fallos.
- [x] Implementar escribir/ilustrar/narrar, vista previa y barra de guardado.
- [x] Recuperar borradores IndexedDB por equipo/capítulo, serializar escrituras y gestionar cuota; verificar recuperación real tras recargar.
- [x] Optimizar imágenes a WebP, conservar proporción y hacer visibles cambiar/quitar/ampliar.
- [ ] Persistir descripción alternativa redactada por el equipo; requiere ampliación del esquema. Actualmente se ofrece descripción contextual.
- [x] Recuperar audio inicial, usar pausa real, detectar MIME y liberar recursos; incorporar carga de lectura ya grabada como alternativa.
- [ ] Probar teclado, permisos denegados, salida, interrupción y reconexión.

**Entrega:** taller de edición móvil completo.  
**Salida:** una pareja puede crear los tres aportes, salir y recuperarlos; un error nunca se presenta como guardado correcto.

### Fase 6 — Medios ligeros e integridad del flujo · L

**Depende de:** contratos definidos en fases 0–1; puede adelantarse en paralelo. Necesaria antes de liberar nuevas cargas y distribuir la versión final.

- [x] Sesiones firmadas verificadas en servidor, roles, origen y acciones docentes protegidas.
- [x] Implementar reserva atómica y validación de pertenencia/un capítulo por equipo; verificar API demo.
- [ ] Verificar transacciones enfrentadas sobre PostgreSQL de ensayo; nunca usar la base de la clase para esta prueba.
- [x] Separar metadatos/textos de medios; listar sin blobs y servir medios mediante URLs versionadas. Desde el 30/09, la lectura del libro y de sus medios es pública.
- [ ] Seleccionar almacenamiento compatible con el alojamiento, límites y presupuesto.
- [x] Admitir cargas optimizadas de imagen y audio con formato real; servir audio bajo demanda con rangos y ETag.
- [ ] Incorporar subida directa y variantes en almacenamiento de objetos. Se conserva el almacenamiento legado en base64.
- [ ] Migrar medios mediante lectura dual y lotes verificables, conservando posibilidad de volver atrás.
- [x] Detectar conflictos de versión y aplicar nuevos aportes a pedido cuando el motor está en reposo.

**Entrega:** contenido audiovisual ligero y flujo fiable.  
**Salida:** listado sin medios completos; archivos previos/nuevos legibles; cambios atribuibles al equipo autorizado y cero sobrescrituras silenciosas en los casos probados.

### Fase 7 — Verificación y ajuste final · M/L

**Depende de:** fases 3–6.

- [ ] Ejecutar la matriz de la sección 11 y corregir fallos prioritarios.
  - Matriz de tamaños, paginación, borradores, guardado y permisos completada localmente. Hardware, micrófono físico, red adversa y accesibilidad completa pendientes.
- [x] Afinar giro de 580 ms, sombras, papel y composición; revisar capturas y giros en navegador.
- [ ] Registrar vídeo y fluidez en dispositivos físicos.
- [ ] Medir rendimiento sobre build de producción y reducir los costes detectados.
  - Empaquetado y volumen de archivos estáticos comprobados; no se midieron LCP/INP/FPS en celulares.
- [ ] Revisar voz, teclado, contraste, zoom y lectura continua.
  - Reproducción/pausa y lectura continua verificadas. Grabación, teclado virtual, VoiceOver/TalkBack y zoom físico pendientes.
- [x] Completar lint, tipos, build y pruebas de comportamiento; resultados en el informe de verificación.
- [x] Preparar build/start portable con Node y verificar el servidor standalone de producción.

**Entrega:** informe de pruebas con dispositivo, versión, resultado y evidencia.  
**Salida:** no hay fallos críticos de guardado, lectura, giro, micrófono o autorización; cualquier dispositivo no probado figura como pendiente.

### Fase 8 — Entrega y continuidad · S

**Depende de:** fase 7.

- [x] Preparar guía de uso para parejas y docente en `docs/GUIA_DE_USO.md`.
- [x] Documentar configuración, límites, compatibilidad y decisiones pendientes en `docs/BACKEND.md`.
- [x] Registrar reversión y continuidad en el informe; no se modificó el esquema ni se migró la base real.
- [x] Actualizar casillas y evidencias de este plan.
- [x] Preparar demo local revisable y capturas. Publicación y configuración del alojamiento siguen pendientes.

**Entrega:** versión lista para uso y documentación de mantenimiento.

## 11. Matriz de pruebas y criterios de aceptación

### Dispositivos y condiciones

| Entorno | Cobertura |
|---|---|
| Viewports 320 × 568, 360 × 800, 390 × 844 y 430 × 932 | Composición, títulos largos, barras, objetivos táctiles y ausencia de desborde. |
| Safari en iPhone físico | Arrastre/cancelación, barra del navegador, orientación, reproducción, permisos y grabación por HTTPS. |
| Chrome en Android físico de gama media | Fluidez con medios, memoria, grabación, galería y red limitada. |
| Tableta 768 × 1024 y orientación horizontal | Cambio entre una y dos páginas, índice y posición conservada. |
| Escritorio 1366 × 768 y 1440 × 900 | Doble página, ratón, teclado y proyección. |
| Red lenta, desconexión y reconexión | Guardado veraz, borrador recuperable, medios con reintento y libro parcialmente cargado. |
| Texto 200 %, ancho 320 CSS px, movimiento reducido | Contenido completo, controles accesibles y alternativa sin giro. |

No hace falta automatizar cada detalle visual. Automatizar principalmente la lógica que puede perder contenido, mezclar páginas o mentir sobre el guardado. Complementar con pruebas manuales de calidad visual y dispositivos físicos.

### Escenarios obligatorios

| ID | Caso | Resultado esperado |
|---|---|---|
| B01 | Libro vacío, un capítulo y todos los capítulos. | Estados correctos; navegación sin índices inválidos. |
| B02 | 20 avances/retrocesos seguidos y toques rápidos. | Orden estable, un único giro activo, sin bloqueo al final. |
| B03 | Arrastre incompleto/cancelado y movimiento vertical. | La hoja vuelve o avanza coherentemente; no roba el gesto equivocado. |
| B04 | Resumen extenso, párrafo largo, saltos, tildes y palabra larga. | Texto íntegro; ninguna palabra duplicada/perdida y sin recortes. |
| B05 | Cambio de orientación y tamaño de letra a mitad de capítulo. | Reaparece el mismo pasaje o el más cercano; no vuelve al inicio. |
| B06 | Índice hacia atrás/adelante, cantidad impar de páginas y tapa. | Anverso/reverso y contador correctos. |
| B07 | Reproducir, pausar y cambiar dentro/fuera del capítulo. | Un solo audio, reanudación real y política de cambio coherente. |
| B08 | Ilustración vertical, horizontal, pequeña o rota. | Sin recorte de contenido; ampliación o error recuperable. |
| B09 | Solo audio o capítulo incompleto. | Aporte visible y estado honesto, sin marcarlo como completo. |
| B10 | Nuevos aportes mientras el libro está abierto. | Actualización en reposo, sin cambio sorpresivo durante el giro. |
| E01 | Guardado con HTTP 400/409/500 o sin red. | Nunca «Guardado» falso; borrador conservado y reintento. |
| E02 | Editar, volver, recargar y continuar equipo. | Borrador del equipo correcto y audio guardado visibles. |
| E03 | Dos equipos reservan simultáneamente el mismo capítulo. | Solo una reserva exitosa; el otro recibe conflicto comprensible. |
| E04 | Permiso denegado, formato no soportado, salir grabando. | Mensaje útil; micrófono liberado; grabación anterior protegida. |
| E05 | Abrir/cerrar grabadora y libro 10 veces. | Sin audios duplicados ni acumulación de recursos. |
| E06 | Teclado abierto, nombre/título largo y cambio de equipo. | Acciones alcanzables y sin mezcla de contenidos/borradores. |
| A01 | Teclado, lector de pantalla, zoom y movimiento reducido. | Recorrido equivalente, foco predecible y contenido íntegro. |
| D01 | Medios antiguos/nuevos y actualización docente concurrente. | Compatibilidad conservada y conflictos visibles. |
| D02 | Intento de editar capítulo ajeno o acción docente sin sesión válida. | Rechazo del servidor, sin depender de ocultar botones. |
| P01 | Abrir el libro desde el inicio con ambos nombres vacíos; abrir `/libro` directamente y recargar. | Texto, ilustraciones y voz disponibles; Volver lleva al inicio y no se crea un equipo. |
| P02 | Visitante intenta reservar, editar o borrar un capítulo. | Rechazo del servidor; leer el libro no concede permisos de escritura. |

### Qué significa «terminado»

- [x] A 390 px, el navegador muestra una página legible y una portada cuidada.
- [x] Arrastre completo/incompleto y botones verificados en navegador; 20 giros conservan orden y navegación.
- [ ] Confirmar respuesta al dedo, interrupciones y cancelación en Safari/Chrome físicos.
- [x] En pantalla amplia aparece un pliego proporcionado con orden correcto y tapa centrada.
- [x] El resumen de prueba conserva sus 2.437 caracteres íntegros, incluidos Unicode y último párrafo, a través de ocho páginas móviles.
- [x] Un único audio reproduce y pausa; carga de WAV comprobada en el editor.
- [x] Una pareja ficticia completó texto, imagen y audio, guardó y recuperó el trabajo tras recargar.
- [ ] Completar la misma actividad con micrófono y galería en un celular físico.
- [x] Ingreso/listado/libro no descargan todos los binarios dentro del JSON.
- [x] Se conserva esquema y formato existentes; pruebas de medios heredados y URLs sin migración destructiva.
- [ ] Migrar a almacenamiento de objetos con copia/verificación y reversión cuando exista proveedor.
- [x] Navegación y cobertura móvil documentadas con capturas; límites de accesibilidad identificados.
- [x] El resultado se revisó visualmente y con giros reales del motor en navegador, además de compilar.

## 12. Cómo continuar este plan en otra sesión

Empezar leyendo este archivo y el estado del repositorio. Ejecutar la siguiente fase pendiente, manteniendo las decisiones confirmadas. No instalar todas las bibliotecas de la comparación: comenzar con el candidato del prototipo y reutilizar las que ya existen.

En cada fase, registrar qué se entregó, archivos modificados, pruebas realizadas, problemas abiertos y decisión necesaria para continuar. Una casilla con prueba pendiente no se marca completa. Si una elección cambia, actualizar aquí el criterio y su evidencia para que la siguiente sesión no reinicie la investigación.

**Siguiente tarea concreta:** ensayar la demo con Safari en iPhone y Chrome en Android, completar grabación/permisos/teclado/rotación, y medir la versión de producción sobre una base de ensayo. El nuevo libro y el recorrido de creación ya están implementados. Para almacenamiento externo, definir primero alojamiento y proveedor; no rehacer el frontend ni reemplazar el motor sin una limitación comprobada.

### Registro de ejecución

| Fecha | Fase | Entrega / evidencia | Estado | Siguiente paso |
|---|---|---|---|---|
| 27/09/2026 | Planificación | Auditoría de código, ingreso observado en navegador, investigación de motores y decisión de un celular por pareja. | Completa | Preparar línea base y fixtures aislados. |
| 28/09/2026 | Ejecución iniciada | Desarrollo del libro, diseño móvil, editor/voz y contratos ligeros con sesiones de servidor. Las pruebas usarán datos ficticios aislados. | En curso | Integrar componentes y verificar el recorrido completo. |
| 28/09/2026 | Implementación local y cierre | Libro real con `page-flip` 2.0.7, diseño editorial, rutas, borradores, imagen optimizada, grabadora/carga de audio, panel docente y API protegida. Pruebas, capturas y límites en `docs/VERIFICACION_REDISENO.md`. | Terminada y comprobada localmente | Ensayo en teléfonos físicos, rendimiento, PostgreSQL de ensayo y configuración del alojamiento/almacenamiento. |
| 30/09/2026 | Lectura sin ingresar nombres | Botón **Abrir el libro** en el inicio; ruta y medios de lectura pública; regreso al inicio para visitantes. Recorrido móvil, audio, integración, tipos, pruebas y build comprobados en `docs/VERIFICACION_LIBRO_PUBLICO.md`. Lint de la app pasa; lint general detecta errores previos en `scripts/backup-and-clean.js`. | Terminada y comprobada localmente | Mantener las pruebas físicas pendientes y configurar publicación cuando se solicite. |
