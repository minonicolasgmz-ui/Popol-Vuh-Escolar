# Recursos visuales de la edición

| Recurso | Origen y uso |
|---|---|
| Monograma PV, marca de maíz y estrellas (`EditorialMark.tsx`) | SVG originales creados para esta app; ornamentación editorial contemporánea, sin atribuirlos a glifos históricos. |
| Portada y cantos del ingreso | Composición CSS original; no depende de imágenes externas. |
| Portada del lector | Composición tipográfica/SVG original en los componentes del libro. |
| Textura del papel y sombras | CSS; mantiene contraste y evita una descarga adicional. |
| Source Serif 4 | Fuente de Adobe, SIL Open Font License; versiones latina normal e itálica servidas localmente mediante `next/font/local`. Archivo y licencia en `src/app/fonts`. [Proyecto oficial](https://github.com/adobe-fonts/source-serif). |
| Geist Sans | Fuente de Vercel, SIL Open Font License; archivo latino y licencia incluidos en `src/app/fonts`. [Proyecto oficial](https://github.com/vercel/geist-font). |
| Iconos de acciones | Lucide React, ISC; dependencia existente. [Licencia oficial](https://github.com/lucide-icons/lucide/blob/main/LICENSE). |
| Motor de hojas | `page-flip` 2.0.7, MIT, fijado en npm. [Repositorio oficial](https://github.com/Nodlik/StPageFlip). Detalles y puente de limpieza en `DECISION_MOTOR_LIBRO.md`. |
| Ilustraciones del modo demo | SVG originales de prueba en el backend; no representan producciones de alumnos ni se agregan a la base real. |
| Favicon existente | Se conserva el archivo del proyecto. Su origen anterior consta en `worklog.md`; no se presenta como recurso nuevo de este rediseño. |

El modo demo contiene un audio sintético de demostración. La app no incorpora música automática ni sonidos de giro.
