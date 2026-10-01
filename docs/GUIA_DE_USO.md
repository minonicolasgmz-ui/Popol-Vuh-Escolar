# Popol Vuh Escolar: guía de uso

## Para leer el libro

Desde la pantalla de inicio, tocá **Abrir el libro**. Podés leer, ver las ilustraciones y escuchar las voces de la clase sin ingresar nombres. El botón Volver te lleva al inicio. También podés abrir directamente `/libro` y recargar esa página como visitante.

## Para la pareja

1. En el mismo celular, escriban los dos nombres e ingresen. Si vuelven desde ese dispositivo, elijan continuar con su equipo.
2. Elijan un capítulo disponible. Queda reservado para ustedes; cada equipo trabaja en un capítulo.
3. En **Escribir**, cuenten lo que sucede con sus palabras. En **Ilustrar**, elijan una imagen de la galería. En **Narrar**, graben la lectura; también pueden subir un audio ya grabado.
4. Toquen **Guardar capítulo**. El mensaje confirma la respuesta del servidor. Pueden guardar aunque falte alguno de los tres aportes.
5. Abran **El libro**. Deslicen horizontalmente o usen Anterior/Siguiente. El índice permite elegir cualquier capítulo y volver a la portada; el botón AA cambia el tamaño del texto.
6. Toquen Escuchar/Pausar para oír a la pareja autora. **Continua** permite leer todo con desplazamiento normal y seleccionar texto.

El borrador se recupera en el mismo dispositivo y navegador. “Borrador en este dispositivo” significa que todavía falta compartir los cambios mediante Guardar. No borren los datos del navegador ni cierren la sesión antes de guardar el trabajo. Si aparece otra versión del capítulo, revisen el conflicto antes de reemplazarla.

Las imágenes de la galería admiten hasta 15 MB y se preparan a un tamaño menor conservando la proporción. Las nuevas lecturas admiten hasta cinco minutos y 8 MiB. El formato disponible para grabar depende del navegador. Si no pueden grabar allí, utilicen Subir un audio. Para micrófono en celulares, la app debe abrirse por HTTPS y recibir permiso del navegador.

## Para el docente

Ingresá por **Acceso docente** con la contraseña configurada en el servidor. El panel muestra equipo y progreso de cada capítulo; permite leer, escuchar, editar y abrir el libro colectivo. La edición se confirma al guardar y comprueba que nadie haya cambiado antes esa versión.

**Vaciar y liberar** elimina los aportes y deja disponible el capítulo; la app pide confirmación porque no tiene una papelera para deshacer esa acción. Guardá una copia fuera de la app antes de usarla sobre contenido que necesites conservar.

El acceso mediante nombres continúa siendo simple. La sesión en el mismo dispositivo permite continuar el equipo; escribir los mismos nombres desde otro celular crea otro equipo. Recuperar una identidad desde otro teléfono requiere un mecanismo adicional que todavía no se implementó.

## Revisar la demostración local

En la carpeta del proyecto, desde PowerShell:

```powershell
$env:POPOL_VUH_DEMO = '1'
$env:ADMIN_PASSWORD = 'demo-docente-local'
npm run dev
```

Abrí [la app local](http://127.0.0.1:3000). Usá nombres ficticios y alguno de los cuatro capítulos disponibles. La clave docente anterior sirve exclusivamente para esta demo. Los datos están en memoria y se reinician al detener el servidor; no se modifican trabajos de la clase.

El modo demo está prohibido en producción. Para uso real, configurá las variables de [BACKEND.md](BACKEND.md), compilá con `npm run build` y arrancá con `npm start`. El nuevo código no requiere migrar el esquema actual. La publicación y la configuración del alojamiento no forman parte de esta entrega local.

Antes de usarlo con toda la clase, completá el ensayo en iPhone/Android indicado en el [informe de verificación](VERIFICACION_REDISENO.md).
