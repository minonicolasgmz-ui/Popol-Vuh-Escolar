# Libro accesible desde el inicio

Fecha: 30/09/2026. Cambio implementado y comprobado localmente; no publicado.

## Cambio entregado

El inicio muestra **Abrir el libro** y explica que no hace falta ingresar nombres para leer y escuchar. El botón abre `/libro` sin crear un equipo. Esa ruta también funciona al abrirla directamente y al recargar. Un visitante vuelve al inicio; un equipo o docente conserva su regreso habitual. El estado de libro vacío ofrece al visitante **Volver al inicio**.

El texto del libro y sus imágenes y audios admiten lectura sin sesión. Reservar, editar y administrar capítulos siguen exigiendo autorización de servidor. No se modificó el esquema de datos ni se ejecutaron migraciones o escrituras sobre la base real.

## Comprobaciones

| Comprobación | Resultado |
|---|---|
| Tipos (`npm run typecheck`) | Pasa. |
| Revisión de la app, configuración y empaquetado (`npx --no-install eslint src next.config.ts scripts/prepare-standalone.mjs`) | Pasa sin errores ni advertencias. |
| Revisión general (`npm run lint`) | Falla por cuatro usos de `require` previamente existentes en `scripts/backup-and-clean.js`, líneas 1–4 (`@typescript-eslint/no-require-imports`). Ese archivo no fue modificado en este cambio. |
| Libro, editor y backend (`npm test`) | Pasan las diez pruebas de libro/editor y las comprobaciones de backend. |
| Integración aislada (`npm run test:demo`) | Pasa: libro público, imagen GET/HEAD, ETag 304 y rango de audio 206; ninguna cookie creada al leer. Detalle privado, reserva, edición y borrado docente anónimos devuelven 401. |
| Compilación (`npm run build`) | Pasa y genera el servidor standalone con sus recursos. |
| Producción (`npm run test:production`) | Pasa: rutas, fuentes, 15 archivos locales (960 KiB sin compresión) y APIs protegidas. Usa una base ficticia inaccesible y no consulta la base real. |

## Recorrido visual

Navegador Chromium integrado, demo con datos ficticios. Se abrió el libro desde el nuevo botón dejando vacíos los dos campos de nombres. Se usó el índice, se reprodujo y pausó el audio con un único elemento de audio, se volvió al inicio y se comprobó `/libro` mediante navegación directa y recarga sin ingreso.

En viewport móvil de 390 × 844, el botón ocupa todo el ancho disponible y mide 48 px de alto. La portada del inicio tiene 384 px de área de contenido por la barra vertical; su ancho desplazable coincide con esa área. El libro tiene 390 px de ancho y no presenta desborde horizontal. Un avance llevó de la página 10 a la 11. No se registraron errores ni advertencias en la consola.

El audio de la demo es un tono sintético de dos segundos. Esta comprobación no sustituye las pruebas pendientes en celulares físicos registradas en el plan de rediseño.

## Evidencia

- [Inicio con acceso público, escritorio](screenshots/inicio-libro-publico.png)
- [Inicio con acceso público, celular](screenshots/inicio-libro-publico-movil.png)

La guía de uso y los contratos de backend describen el nuevo acceso. Para volver al comportamiento anterior, revertir conjuntamente el botón, la exclusión del libro del guardado de rutas y la lectura pública del listado y los medios; no hace falta revertir datos.
