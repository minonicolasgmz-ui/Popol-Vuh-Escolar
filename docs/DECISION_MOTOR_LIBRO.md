# Motor del libro: decisión e integración

Fecha: 28/09/2026. Implementado `page-flip` **2.0.7**, versión exacta en npm y `package-lock.json`; licencia MIT. [Código y documentación oficiales](https://github.com/Nodlik/StPageFlip).

Se eligió por su geometría de hojas flexibles, tapas rígidas, sombras y modos de una/dos páginas. La app usa el motor directamente a través de `FlipBookAdapter.tsx`, con carga diferida. React conserva sus componentes fuente; el motor administra clones dentro de un contenedor propio y se destruye al cambiar composición/salir. No se instaló un wrapper adicional.

## Configuración final

- Hoja única en móvil; pliego cuando hay al menos 792 px de escena y 420 px de altura útil. El pliego conserva proporción de hoja 1:1,48 y se adapta a la altura, incluso en escritorio de 1366 × 768.
- Giro nominal de 580 ms y sombra máxima de 0,24. Eventos reales del motor indican arrastre, animación y reposo; no hay temporizador de React para cambiar la página.
- Tapas rígidas, interior flexible, contraportada independiente y hoja de cortesía para conservar paridad. Las tapas se centran al cerrar el pliego.
- Gestos Pointer Events con detección de eje: el gesto vertical se cede al navegador. Arrastre incompleto vuelve; `pointercancel` retorna al origen. En modo de hoja única, la distancia horizontal se convierte al espacio del pliegue completo.
- Se desactivan los manejadores táctiles del motor. `disableFlipByClick` permanece en `false` porque su comando de retroceso en modo retrato depende de ese valor; los clics de hoja siguen bajo el control del adaptador.
- Un reproductor por lector, ubicado fuera de las hojas. Imágenes cargadas cerca de la página visible; ninguna hoja contiene controles interactivos que compitan con el arrastre.

## Paginación y continuidad

El DOM mide texto con la tipografía definitiva, encabezado, autores y folio. La fragmentación conserva todos los caracteres y respeta pares Unicode. Las páginas no incorporan scroll interior. Cambios de pantalla/letra reconstruyen la composición solamente en reposo, conservando capítulo y offset de lectura. La posición se guarda en el dispositivo.

La lectura continua ofrece selección de texto, reflujo y recorrido normal. Se activa automáticamente si la escena queda por debajo de 340 px de altura. Con movimiento reducido se usan hojas estáticas sin motor. Si falla la preparación del motor, la lectura continua permite seguir leyendo.

## Compatibilidad y mantenimiento

La versión 2.0.7 deja su bucle de animación activo después de `destroy()`. `installManagedRenderLoop` reemplaza el planificador de **esa instancia**, conserva el cálculo del motor y cancela RAF/actualizaciones tardías al desmontar. No cambia prototipos ni objetos globales. La prueba correspondiente debe conservarse al actualizar la biblioteca.

Este puente utiliza una propiedad interna del motor. Por eso la versión queda fijada: cualquier actualización requiere revisar el adaptador y repetir pruebas de giros, limpieza, paridad y texto íntegro. No se infiere compatibilidad futura por similitud de API.

## Evidencia y límites

Se verificaron arrastres completos/incompletos, índice, avance/retroceso, 20 giros, cambio de letra, móvil/escritorio, reproducción/pausa y resumen largo íntegro en navegador Chromium de Codex. La repetición de giros detectó y permitió corregir un retroceso bloqueado en retrato. Las fuentes y estilos del libro se sirven antes de medir para evitar paginación con métricas incorrectas.

La prueba automatizada de RAF confirma la cancelación y que una devolución tardía no puede reiniciar el bucle. No equivale a un perfil de memoria en hardware. Safari iOS y Chrome Android físicos, multitoque, rotación real y rendimiento siguen pendientes. Véase [verificación](VERIFICACION_REDISENO.md).
