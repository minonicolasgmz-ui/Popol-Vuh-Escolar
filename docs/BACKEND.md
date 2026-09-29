# Sesiones, capítulos y medios

## Configuración del servidor

`SESSION_SECRET` debe ser aleatorio, tener al menos 32 caracteres y permanecer exclusivamente en el servidor. `ADMIN_PASSWORD` debe ser una contraseña propia de al menos 12 caracteres. No usar prefijos `NEXT_PUBLIC_`. La aplicación rechaza valores ausentes y los placeholders de `.env.example`; no incluye contraseñas predeterminadas para producción.

`DATABASE_URL` y `DIRECT_URL` siguen apuntando al PostgreSQL existente. Este trabajo no cambia el esquema, no crea migraciones y no modifica la base durante las pruebas. Configurar los valores reales desde el alojamiento; nunca copiarlos a documentación, capturas o logs.

Las sesiones se firman con HMAC-SHA256 y se guardan en una cookie `HttpOnly`, `SameSite=Strict`, `Path=/` y `Secure` en producción. El equipo dura 14 días; el acceso docente, 8 horas. La firma y el vencimiento se comprueban en el servidor. Los nombres en localStorage no otorgan acceso. Cerrar sesión elimina la cookie del navegador; las sesiones firmadas son sin estado y una copia previa del token sigue vigente hasta vencer. Rotar `SESSION_SECRET` invalida todas las sesiones. Recuperar un equipo desde otro dispositivo y revocar una sesión individual requieren un mecanismo adicional, fuera del esquema actual.

Las escrituras comparan el origen con la cabecera `Host` real de destino y rechazan solicitudes `Sec-Fetch-Site: cross-site`; no confían en `X-Forwarded-Host`. Esto permite localhost y 127.0.0.1 aunque Next normalice internamente la URL. El proxy del alojamiento debe conservar la cabecera Host pública y producción requiere origen HTTPS. El cuerpo JSON se lee con límite de bytes, incluso sin `Content-Length`. El acceso docente y la creación de equipos tienen un límite adicional por proceso; en un despliegue con varias instancias se debe complementar con un limitador compartido y confiar solo en cabeceras IP normalizadas por el alojamiento.

## Demostración local aislada

Activar explícitamente `POPOL_VUH_DEMO=1` al iniciar el servidor de desarrollo. El modo demo funciona solamente con `NODE_ENV=development` o `test`: en producción falla cerrado. No importa ni inicializa Prisma, no lee la base, y utiliza datos en memoria. Al reiniciar el proceso se reinician las producciones y las sesiones demo. Los datos y las firmas demo están separados de los reales.

En PowerShell, antes de iniciar `npm run dev`:

```powershell
$env:POPOL_VUH_DEMO = '1'
$env:ADMIN_PASSWORD = 'demo-docente-local'
npm run dev
```

La contraseña anterior es pública y sirve exclusivamente para la demostración local. No colocar ese valor en producción. En demo la clave de firma se genera aleatoriamente para el proceso; fuera de demo es obligatorio configurar `SESSION_SECRET`.

Hay ocho capítulos ficticios: cuatro con aportes y cuatro disponibles. Los nombres son de muestra; las ilustraciones SVG son originales y decorativas, sin pretensión de autenticidad histórica. El WAV de dos segundos es un tono de prueba, no la voz de un alumno. La demo permite crear un equipo, reservar, escribir, cargar imagen/audio, guardar, leer el libro y probar la administración con los mismos endpoints del flujo real.

## Contratos HTTP

Todas las respuestas JSON de contenido llevan `Cache-Control: no-store`. Los errores tienen `{ error, code }` sin detalles internos ni secretos. Códigos relevantes: 401 sin sesión, 403 sin permiso, 409 conflicto de reserva/versión, 413 tamaño excesivo, 415 formato no permitido, 429 demasiados intentos y 503 configuración pendiente.

| Método y ruta | Contrato |
|---|---|
| `POST /api/groups` | `{student1, student2}` → grupo y cookie de equipo. No reutiliza identidades por igualdad de nombres. Cada nombre admite 1–80 caracteres. |
| `GET /api/session` | `{group, isAdmin, demo}`. Sin sesión, `group:null` e `isAdmin:false`. Verifica que el equipo todavía exista. |
| `DELETE /api/session` | Elimina la cookie y devuelve sesión vacía. |
| `POST /api/admin/session` | `{password}` → cookie docente y `{group:null,isAdmin:true,demo}`. |
| `GET /api/stages` | Requiere sesión; metadatos, `text:null`, `hasText/hasImage/hasAudio`, autores, fechas y URLs propias de medios. No carga blobs desde PostgreSQL. |
| `GET /api/stages?mode=book` | Igual, con texto completo para construir páginas. Los medios siguen siendo URLs. |
| `GET /api/stages/:id` | Texto completo y URLs, disponible para cualquier equipo autenticado o docente. |
| `PUT /api/stages/:id/claim` | Reserva para el equipo de la cookie. Ignora cualquier `groupId` del cliente; cuerpo opcional. |
| `PUT /api/stages/:id` | `{expectedUpdatedAt,text?,imageUrl?,audioData?}`. Requiere pertenencia del equipo o acceso docente. |
| `GET /api/groups` | Solo docente; grupos y resúmenes de capítulos, sin blobs. |
| `GET /api/admin/stages` | Solo docente; textos y URLs de todos los capítulos. |
| `PUT /api/admin/stages/:id` | Como PUT de capítulo; permite además `groupId`, `student1`, `student2`. |
| `DELETE /api/admin/stages/:id` | Solo docente; JSON `{expectedUpdatedAt}`. Vacía los tres aportes y libera la reserva. La interfaz debe confirmar esta acción antes de enviarla. |
| `GET/HEAD /api/stages/:id/media/image` | Imagen binaria autenticada con MIME, ETag y versión en URL. |
| `GET/HEAD /api/stages/:id/media/audio` | Audio autenticado; admite un rango `bytes` con 206/416 y `If-Range`. |

El consumidor debe usar el `updatedAt` recibido como `expectedUpdatedAt` al guardar. Un 409 conserva el borrador local y requiere revisar la versión actual. El servidor incrementa la versión aun cuando dos operaciones ocurren en el mismo milisegundo.

La reserva y las modificaciones reales usan transacciones PostgreSQL `Serializable` con reintento acotado de conflictos, validación de pertenencia y actualización condicional. La restricción de un capítulo por equipo se aplica dentro de esa transacción, incluidas las reasignaciones docentes. No se agregó una restricción única al esquema: cualquier herramienta que escriba directamente en la base debe respetar la misma regla. Los datos anteriores con varias asignaciones no se eliminan automáticamente.

## Medios y compatibilidad

Los campos existentes conservan el almacenamiento legado de base64. El listado SQL solo consulta presencia y metadatos; el libro añade texto. Los binarios se decodifican bajo demanda en rutas separadas, sin blobs dentro del JSON. Las respuestas binarias usan `private, no-cache`, `Vary: Cookie`, `ETag` y URLs versionadas por `updatedAt`; se exige sesión antes de responder incluso a una revalidación.

En PUT, `null` elimina un medio, omitir el campo lo conserva y enviar la URL propia recibida también lo conserva. Una data URL válida lo reemplaza. No se guardan URLs internas como si fueran contenido ni se aceptan URLs arbitrarias nuevas. Las referencias HTTPS antiguas se mantienen mediante redirección sin petición de red del servidor. Formatos heredados reconocidos por firma tienen prioridad sobre un MIME antiguo incorrecto. Si un medio histórico usa otro formato, se devuelve un error recuperable y se conserva el registro.

Límites actuales: imagen 8 MiB, audio 20 MiB, texto 100.000 caracteres. Las imágenes admitidas son JPG/PNG/WebP/GIF/AVIF; audio WebM/Ogg/MP4/MP3/WAV/AAC según firma detectada. Los SVG de demostración son controlados por el servidor; no se aceptan SVG subidos. Se comprueban firmas básicas, no se implementa análisis antivirus ni transcodificación. No se fuerza un recorte de textos existentes: el límite se aplica a nuevas escrituras.

**Pendiente antes de ampliar escala:** elegir proveedor de almacenamiento compatible con el alojamiento, configurar credenciales solo servidor, subir archivos directamente con autorización y límites, generar variantes de imagen y migrar el legado por lotes verificables con lectura dual. No se ha configurado ni supuesto un proveedor. Esta implementación reduce la transferencia inicial y permite rangos, pero todavía decodifica cada blob completo en memoria antes de responder: no es streaming del objeto desde almacenamiento. También siguen pendientes metadatos persistidos como texto alternativo de imagen y duración del audio, que requieren ampliar el esquema.

## Verificación reproducible

Pruebas unitarias sin red ni base de datos:

```powershell
node tests/backend-unit.cjs
```

Integración contra la demo ya iniciada (se niega a escribir si `/api/session` no confirma `demo:true` o el host no es local):

```powershell
$env:ADMIN_PASSWORD = 'demo-docente-local'
$env:BACKEND_TEST_URL = 'http://127.0.0.1:3000'
node tests/backend-demo.mjs
```

Las pruebas de integración crean nombres ficticios y liberan los dos capítulos que reservaron. Reiniciar la demo si una prueba interrumpida dejó reservas. Cubren cookies, autenticación/autorización, origen, DTO sin blobs, reservas enfrentadas, equipo único, pertenencia, versiones, retención de medios, formatos, rangos y reset docente. La atomicidad PostgreSQL se implementó pero requiere una prueba separada sobre una base de ensayo configurada explícitamente: las pruebas demo no prueban aislamiento real de PostgreSQL y nunca deben ejecutarse contra la base de la clase.
