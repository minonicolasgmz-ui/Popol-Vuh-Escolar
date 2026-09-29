# Verificación del rediseño

Fecha: 28/09/2026. Entrega local implementada; no publicada. Entorno: Windows, Node 24.11.1, Next 16.2.4, React 19.2.5, `page-flip` 2.0.7; navegador Chromium integrado en Codex.

## Resultado de las comprobaciones

| Comprobación | Resultado y alcance |
|---|---|
| `npm run typecheck` | Pasa; código de la app y tipos generados de Next. |
| `npm run lint` | Pasa sin errores ni advertencias. |
| `npm test` | Diez pruebas de libro/editor y comprobaciones de backend pasan. |
| `npm run test:demo` | Integración HTTP pasa contra demo local aislada, nunca contra PostgreSQL real. |
| `npm run build` | Build de producción y empaquetado standalone pasan. |
| `npm run test:production` | Arranque standalone, rutas, archivos locales, fuentes y APIs protegidas pasan; usa una URL de base ficticia inaccesible y no consulta datos reales. |

Las pruebas de libro comprueban texto íntegro con párrafos, tildes, emoji y palabras extensas; orden/paridad; capítulos solo con audio; continuidad del pasaje después de cambiar letra; cancelación del bucle de animación y compatibilidad de medios. Las del editor verifican orden de escrituras de borradores, limpieza después de guardar, aislamiento de equipos, errores de cuota, bytes/MIME de audio y proporción de imágenes.

El backend se prueba con sesiones firmadas, roles, origen, validación, límites, reservas enfrentadas, pertenencia, un capítulo por equipo, versiones, retención de medios y rangos HTTP. El aislamiento de transacciones de PostgreSQL está implementado pero debe ensayarse sobre una base de pruebas antes de afirmar que fue comprobado con el servidor real.

## Recorrido comprobado en pantalla

Una pareja ficticia, **Luna Demo y Tomás Demo**, ingresó, reservó el capítulo 5, escribió un resumen de **389 palabras y 2.437 caracteres**, salió y recargó. El editor recuperó el texto completo desde su borrador. Luego se agregó una imagen PNG vertical de 640 × 800 que se convirtió a WebP conservando proporción, y una lectura WAV de prueba mediante Subir un audio. El guardado respondió correctamente y el editor mostró **3 de 3 aportes listos / Guardado en el libro**. El índice del libro mostró los dos autores y los tres aportes.

El resumen se repartió en **ocho páginas** a 390 × 844 y letra de 19 px. Se comparó la concatenación de los textos de las hojas con el original: **igualdad exacta de los 2.437 caracteres**, incluido el último párrafo y Unicode. Una página activa midió aproximadamente 307,66 px de texto dentro de 312 px disponibles. El número de páginas cambia con altura, tamaño de letra y contenido; ocho es el resultado de esta prueba, no un número fijo por capítulo.

Se completaron 20 avances/retrocesos consecutivos y saltos por índice. Un arrastre corto volvió a la misma página; arrastres amplios avanzaron hojas consecutivas. El ensayo detectó dos fallos del motor en retrato —escala del gesto y retroceso— que fueron corregidos en el adaptador. Se probó cambio de letra y de móvil a escritorio conservando el capítulo y el pasaje. La tapa volvió mediante el índice y se comprobó centrada en escritorio.

La lectura continua mostró el texto completo. Se reprodujo y pausó el audio de demostración, comprobando pausa real y **un único elemento audio** en el lector. La voz de prueba es un tono sintético de dos segundos; no representa una grabación real de alumnos. No se concedió permiso al micrófono del dispositivo durante este ensayo.

## Tamaños de pantalla

| Tamaño CSS | Modo y resultado observado |
|---|---|
| 320 × 568 | Lectura continua automática por poca altura; sin desborde horizontal. |
| 360 × 800 | Una hoja; sin desborde horizontal. |
| 390 × 844 | Una hoja, portada, índice, editor, guardado y texto largo completos. |
| 430 × 932 | Una hoja; sin desborde horizontal. |
| 768 × 1024 | Una hoja amplia; sin desborde horizontal. |
| 1366 × 768 | Pliego adaptado a altura y tapa centrada, sin desborde. |
| 1440 × 900 | Pliego; continuidad del texto y composición revisadas. |

Los botones principales del lector medidos en los tamaños móviles tienen al menos 44 px de ancho y alto. Son viewports emulados en Chromium: no prueban barras de Safari, teclado virtual, presión del dedo, limitación térmica ni rendimiento de un celular.

## Evidencia visual

- [Ingreso en celular](screenshots/ingreso-movil.png)
- [Capítulos en celular](screenshots/capitulos-movil.png)
- [Editor en celular](screenshots/editor-movil.png)
- [Portada en celular](screenshots/libro-movil.png)
- [Libro en escritorio](screenshots/libro-escritorio.png)
- [Tapa centrada en escritorio de menor altura](screenshots/libro-portada-escritorio.png)
- [Panel docente en celular](screenshots/docente-movil.png)

Las capturas contienen exclusivamente datos de demostración. El recorrido de edición y lectura no registró errores de consola. Durante recarga de desarrollo se observó una respuesta de JavaScript transitoria inválida al abrir docente; el archivo servido pasó la comprobación sintáctica y la recarga recuperó el panel. Después del build final se reinició la demo y se verificó ingreso/libro desde una pestaña nueva: sin errores ni advertencias de consola, portada móvil a 390 px y pliego a 1440 px. En este último, dos áreas de texto de 366/415 px contienen textos de 307,66/184,59 px, sin recorte. Debe distinguirse del resultado del build standalone, que también se verificó. Las capturas del antes son incompletas: la comparación inicial se apoya también en la auditoría registrada en [BASELINE_REDISENO.md](BASELINE_REDISENO.md).

## Rendimiento: evidencia disponible

El listado y el libro usan URLs de medios, sin transportar sus blobs dentro del JSON; el listado SQL tampoco selecciona blobs. La imagen del editor se reduce a un máximo de 1600 px, el motor se carga al abrir el libro, las imágenes se preparan cerca de la hoja activa y el audio se solicita por separado. Las fuentes y sus licencias se empaquetan localmente.

La prueba standalone final comprobó **15 archivos locales, 959 KiB antes de compresión**, referenciados por el HTML inicial. Ese número mide empaquetado, no tiempo de carga ni consumo completo del libro. **No se midieron LCP, INP, FPS, memoria ni velocidad sobre red móvil.** Los presupuestos del plan siguen siendo objetivos pendientes de medición.

## Pendientes concretos

1. Ensayar Safari en iPhone y Chrome en Android físicos: grabar, permiso denegado, volver de otra app, galería, teclado, giros, cancelación, multitoque y orientación.
2. Verificar VoiceOver/TalkBack, recorrido por teclado, contraste completo, zoom 200 % y movimiento reducido del sistema. La alternativa está implementada; el ensayo del sistema operativo no se realizó.
3. Ensayar red lenta, desconexión/reconexión real, medios fallidos y nuevos aportes mientras se gira una página. Los mensajes y defensas están implementados; no se presenta esa matriz como completada.
4. Usar una base PostgreSQL de ensayo para reservas/transacciones enfrentadas y para comprobar compatibilidad con una copia autorizada de los datos existentes.
5. Configurar alojamiento HTTPS, contraseña docente y secreto de sesión reales; medir producción con medios representativos y teléfonos de la clase.
6. Elegir almacenamiento de objetos e implementar subida/migración por lotes. Hoy se conserva base64 en PostgreSQL y cada medio se decodifica completo en memoria antes de responder.
7. Ampliar el esquema para descripciones alternativas escritas por los alumnos y duración persistida de audio.

## Continuidad y reversión

El código permanece como cambios locales revisables; no se creó despliegue ni se ejecutaron migraciones o comandos de modificación de la base de la clase. La nueva API lee los formatos existentes y conserva campos omitidos o URLs propias al guardar. Las pruebas reales de edición se limitaron a la demo en memoria.

Para volver a una versión anterior, conservar primero el diff/commit de esta entrega y restaurar frontend y API juntos desde una revisión conocida. No descartar archivos a ciegas: hay código nuevo y documentación sin commit. El esquema no necesita reversión porque no cambió. Rotar el secreto de sesión invalida sesiones vigentes y obliga a ingresar nuevamente.

La futura migración de medios requiere copia y comprobación por lote antes de reemplazar referencias; no borrar el legado hasta validar todos los archivos y acordar una ventana de reversión. La siguiente sesión debe continuar desde las casillas pendientes del [plan](../PLAN_REDISENO_MOBILE_Y_LIBRO.md), sin repetir la integración del libro ya terminada.
