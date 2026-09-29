# Línea base del rediseño

Fecha: 28/09/2026. Se preserva el contenido de la base existente; las pruebas de edición utilizan únicamente `POPOL_VUH_DEMO=1` en desarrollo.

## Estado inicial

- Ingreso observado en navegador de escritorio y viewport 390 × 844 durante la planificación: formulario de dos integrantes operativo, sin errores de consola en esa pantalla. Composición negra, jade brillante y controles estrechos.
- Libro anterior: dos columnas incluso en móvil, mínimo 500 px, giro rígido de 800 ms, texto con scroll interior y contador de capítulos como páginas.
- Medios anteriores: `GET /api/stages` devuelve imágenes y audio base64 de todos los capítulos.
- Tipos iniciales: 4 errores en ejemplos WebSocket y recursos del directorio `skills`, ajenos al código de la app. La configuración ahora limita el chequeo a la aplicación y los tipos generados de Next.
- Next infería una raíz superior al proyecto por lockfiles de directorios ancestros. Se fija `turbopack.root` y `outputFileTracingRoot` en este proyecto.
- El build ignoraba errores de tipos y los scripts dependían de `cp`, asignaciones de entorno Unix y Bun. Se restauran comprobaciones y preparación portable mediante Node.

## Datos y medidas

El modo de demostración prepara textos cortos/largos, imágenes SVG originales y capítulos pendientes. No representa trabajos reales. Permite verificar reservas, conflicto de versiones y persistencia local sin escribir en PostgreSQL.

La medición de carga inicial, tamaño de respuestas y recorrido visual se añadirá en `VERIFICACION_REDISENO.md`. Los objetivos del plan no se presentan como medidas ya obtenidas.
