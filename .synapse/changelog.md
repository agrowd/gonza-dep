# changelog.md - Historial de Versiones

## [0.1.0] - 2026-06-12
### Added
- Inicialización del proyecto.
- Extracción de requerimientos desde `AppWeb Agenda.docx` a `AppWeb_Agenda_extracted.md`.
- Creación de la estructura del motor Ariadne v5.0 (`.synapse/`).
- Documentación inicial de arquitectura y plan de trabajo.

## [0.2.0] - 2026-06-16
### Added
- Backend de Autenticación (login, logout, session) y utilidades de firma nativas.
- Integración de WhatsApp Web JS y Puppeteer headless para Debian VPS.
- Webhook de MercadoPago y endpoints de cobros de señas y reservas.
- Frontend de Agenda interactiva semanal y Directorio de Clientes con fichas digitales.
- Módulo de Estadísticas (API de agregación y vista de panel con control de pérdidas).
- Módulo de Notificaciones (lista de envío semanal de recordatorios y generador de imágenes QR).
- Módulo de Configuración (ABM de Zonas, horarios dinámicos y editor de plantillas de WhatsApp).

## [0.3.0] - 2026-06-19
### Added
- Integración de Nodemailer y creación de `src/lib/email.js` con plantilla HTML premium adaptada a la marca.
- Disparador de correos automático por inasistencia al cambiar el estado de turno a `NO_ASISTIO`.
- Botón "+ Crear Nuevo Cliente" y formulario modal en `/admin/clientes`.
- Autocompletado buscador predictivo de clientes existentes en el modal de agendado manual en `/admin/agenda`.
- Grilla del calendario semanal y disparadores interactivos dinámicos según los horarios laborales configurados.
- Soporte para filtro "Turnos en 2 Días" en la sección de notificaciones y API backend.
- Modificaciones de robustez en React utilizando optional chaining `?.` para prevenir caídas de UI por datos de cliente nulos.

## [0.4.0] - 2026-06-23
### Added
- Integración del logo oficial de marca (`/logo.png`) en todas las vistas: login, sidebar admin, booking público, success y failure.
- Despliegue completo en nuevo VPS Ubuntu 24.04 (`187.127.9.216`) con PostgreSQL, Nginx, PM2 y credenciales de MercadoPago en producción.

### Fixed
- Indicaciones previas en la reserva online: asteriscos `**` de markdown crudo reemplazados por etiquetas `<strong>` HTML para renderizado correcto de negritas.

## [0.5.0] - 2026-06-24
### Added
- Configuración de correo SMTP corporativo con Hostinger (`turnos@depilacionparahombres.com`) y test de conexión exitoso vía puerto 465 SSL.
- Función de formateo robusto `formatArgentinaPhone` en `src/lib/whatsapp.js` para corregir números locales de 10 dígitos (ej. `1171244149`) al formato internacional requerido por WhatsApp Web (`5491171244149@c.us`), resolviendo el error `No LID for user`.
- Filtro de zona horaria de Argentina (GMT-3) en `/api/admin/notificaciones` para evitar desfases de fechas y garantizar que los turnos aparezcan correctamente según la hora local.

## [0.6.0] - 2026-06-25
### Changed
- Reemplazo del logotipo principal de la aplicación (`public/logo.png`) por la versión blanca (`Logo-Gonzalo-Depilacion-para-hombres-Blanco.png`).
- Conservación del favicon (`src/app/favicon.ico`) con el logotipo circular original.
- Despliegue en el VPS de producción de Hostinger, compilación de Next.js y reinicio del servidor de PM2.

## [0.7.0] - 2026-06-25
### Added
- Nueva vista diaria ("Día") con toggle e input selector de fechas rápido en `/admin/agenda`.
- Detección de ancho de pantalla móvil (<768px) para seleccionar vista diaria automáticamente por defecto.
- Lógica de autocompletado y redirección de calendario basada en la última cita y frecuencia del cliente seleccionado en agendados manuales.
- Cron en background en `src/lib/whatsapp.js` que se ejecuta cada 15 minutos y dispara recordatorios a las 48 horas en la ventana horaria de 10:00 a 11:00 AM (hora de Argentina).
- Ordenamiento alfabético ascendente en `/api/zonas`.

### Changed
- Reemplazo del indicador "Señas Cobradas" por "Total Bonificaciones" en el panel y API de estadísticas.
- Ocultamiento de la información secundaria en el calendario para bloques de turnos de 30 minutos o menos.
- Registro del `turnoId` al almacenar notificaciones en la base de datos para evitar envíos duplicados automáticos.

## [0.8.0] - 2026-06-26
### Added
- Línea de tiempo reactiva en tiempo real (`.currentTimeLine`) en la agenda diaria y semanal.
- Botones de acceso rápido en detalles del turno para ver la Ficha del Cliente y Programar Siguiente Turno (calculando fecha por frecuencia en semanas).
- Soporte para parámetros de búsqueda (`?id=...`) en la vista de clientes para auto-abrir perfiles.
- Rediseño de modal de clientes con cabecera y pestañas fijas (`sticky`) y cuerpo scrollable para mejorar el cierre del modal en móviles.
- Campo DNI del cliente visible en el encabezado de su ficha digital.

### Changed
- Modificación de cabecera de la landing page pública y páginas de éxito/error a color de marca bordó oscuro (`var(--color-primary)` / `#7a1e1e`).
- Cambios de etiquetas "Observaciones Exclusivas para Gonzalo" a "Observaciones del Operador" y actualizados sus placeholders.

## [0.9.0] - 2026-06-29
### Added
- Validación manual de duplicados para DNI, Email y Teléfono (creación y actualización manual).
- Vista mensual interactiva ("Mes") en la agenda administrativa.
- Solución de scroll móvil en la agenda para permitir scroll nativo de página (eliminación de contenedor rígido y doble scrollbox).
- Prevención de solapamiento de horarios y bloqueo de reservas de fechas/horas pasadas usando GMT-3.
- Estado por defecto `PENDIENTE_PAGO` en turnos manuales nuevos y soporte para bonificaciones por porcentaje y valor fijo.
- Copia oculta BCC global automática a `nuevacuenta@depilacionparahombres.com` en todos los correos.
- Envío manual de comprobantes de turno y señas por correo mediante POST `/api/admin/turnos/[id]/enviar-recibo` y el botón "Enviar Recibo por Mail".
- Cron para el envío diario y automático de correos de mantenimiento a los 75 días (2.5 meses) de turnos finalizados sin reservas posteriores.
- Extensión del rango de reservas online para clientes de 2 semanas a 1 mes (30 días hábiles).
- Rango de fechas libre y personalizado (Desde / Hasta) con Date Pickers en la sección de estadísticas de negocio.
- Logotipo de la barra de navegación lateral agrandado a `190px` de ancho.
- Compilación del bundle de producción local (`npm run build`) verificada de forma exitosa (29/29 rutas).

## [1.2.2] - 2026-07-23
### Fixed
- Alto contraste negro (`color: #111111; font-weight: 600`) para la visualización de zonas e historial de turnos en las tarjetas de la ficha del cliente (`clientes.module.css`).
- Preservación de precios, seña y duración personalizadas al abrir el modal de reprogramación/edición de turnos administrativos (`src/app/admin/agenda/page.js`).
- Alineación de grilla horaria en la agenda: se corrigió el conteo de filas de fondo en `gridLines` a `Array.from({ length: endHour - startHour })` y se implementó cálculo dinámico de `endHour = maxAppEndHour` para extender el horario si existen citas agendadas hasta las 22:00 hs.

### Added
- Gestión de múltiples turnos activos en el portal de autogestión pública (`/api/clientes/consultar` y `src/app/page.js`): ahora los clientes pueden visualizar todos sus turnos agendados y reprogramar o cancelar de forma independiente cada uno de ellos.

## [1.2.1] - 2026-07-22
### Fixed
- Corrección de ancho completo (100% width) para el campo de número de WhatsApp en modales de creación y edición de clientes (`src/app/admin/clientes/page.js` y `src/app/admin/agenda/page.js`): se asignó `grid-column: 1 / -1` y `flex: 1`, `min-width: 0` al contenedor de la bandera `🇦🇷 +54` y el campo numérico. Esto evita que el input quede aplastado en columnas secundarias del 50% de ancho y permite visualizar y cargar el teléfono cómodamente desde celulares y computadoras.

### Changed
- Unificación cromática del correo de cancelación y aviso de inasistencia: se reemplazaron los tonos bordó oscuros (`#7a1e1e`) por la paleta dorada `#d4a54d` sobre tarjetas oscuras con bordes de 4px, logrando coherencia estética y máximo contraste con la plantilla de confirmación.
- Formateo estricto e inline de fechas y horarios en todas las plantillas de correo (`src/lib/email.js`): se agregaron estilos explícitos `style="color: #d4a54d !important; text-decoration: none !important;"` para el horario y `style="color: #ffffff !important; text-decoration: none !important;"` para las fechas. Esto impide que Gmail, iOS Mail y clientes webmail detecten los patrones horarios como hipervínculos azules y los resalta en el color dorado corporativo.

## [1.2.0] - 2026-07-20
### Added
- Soporte para zona extra "Otros" en formularios de creación y reprogramación de turnos administrativos, permitiendo añadir una zona personalizada y editar manualmente el precio total y la duración.
- Edición e integración de Observaciones Generales del Cliente en el modal "Detalle del Turno". Se enlazó directamente con `cliente.observaciones` de la base de datos para ver, editar y guardar en cascada para todos sus turnos.
- Sincronización automática de notificaciones: al pausar o reactivar las notificaciones globales, se actualiza masivamente el estado `enviarNotificaciones` de todos los clientes en la base de datos.
- Preservación de estado de fecha y vista de la agenda: al hacer clic en "Ver Ficha del Cliente" y cerrar la ficha pulsando la "X", se retorna exactamente al mismo día, semana o mes y modo de vista que se estaba consultando.
- Diseño responsivo para el buscador de clientes en móviles, apilando los controles de búsqueda verticalmente y asegurando que la barra de texto se exponga y visualice de forma legible al 100% del ancho disponible.
- Búsqueda insensible a mayúsculas/minúsculas (case-insensitive) en el buscador de la base de datos de clientes, corrigiendo fallos de búsqueda en producción bajo PostgreSQL.
- Diseño responsivo para el Catálogo de Zonas y Precios en móviles, transformando la grilla tabular en tarjetas (cards) individuales para que las columnas de Duración y Acciones (Editar/Eliminar) sean visibles e interactivas.
- Configuración del correo electrónico de respaldo (BCC) en todas las notificaciones transaccionales reemplazando 'nuevacuenta@depilacionparahombres.com' por 'backup@depilacionparahombres.com' tal como se solicitó para su posterior provisión.

### Changed
- Remoción del bloqueo de notificaciones global estricto: ahora las notificaciones se rigen por la preferencia individual de cada cliente (permitiendo envíos selectivos incluso con la pausa global activada).

## [1.1.1] - 2026-07-15
### Added
- Importación Masiva de Clientes: Implementado script para procesar, normalizar y cargar 428 clientes del archivo exportado de AgendaPro (`clientes_452252_1783952206.xlsx`) de forma directa y segura en la base de datos PostgreSQL de producción y SQLite de desarrollo local sin comprometer la privacidad (los datos sensibles se manejaron de forma aislada sin subirse a Git).
- Normalización automática de números de teléfono (formato internacional +54 9...), DNIs float a strings limpios y emails nulos.

## [1.1.0] - 2026-07-13
### Added
- Edición de Zonas Administrativa: Agregado selector de checkboxes de zonas en el modal de edición/reprogramación del operador. Ahora se recalculan en tiempo real la hora de fin, monto total y seña al modificar las zonas de una cita.
- Soporte en backend PUT de turnos para guardar las zonas modificadas en formato JSON en la base de datos.
- Ordenamiento en Autogestión: Añadido `orderBy` por fecha y hora ascendente al buscar el turno activo de un cliente en autogestión. Si el cliente tiene múltiples citas futuras, se le mostrará la más cercana.
- Numeración de Sesiones por Cliente: Modificado el listado de historial de turnos de la ficha del cliente en el panel administrativo para que las sesiones se numeren cronológicamente de forma ascendente y **solo** incrementen para turnos con estado `REALIZADO`. Las cancelaciones y citas futuras no llevan prefijo numérico para no distorsionar el contador.

### Changed
- Contraste de colores: Modificados colores de texto de los badges de estado en la Ficha del Cliente para usar las variables CSS oscuras y legibles (SEÑADO, REALIZADO, CANCELADO, etc.).
- Legibilidad de advertencias: Cambiado el color amarillo claro (`#ffb74d`) de los mensajes de solapamiento en la agenda por un color ámbar/dorado oscuro de alta legibilidad (`#b45309`).
- Política de Cancelación en Autogestión: Mensaje de confirmación del portal de clientes modificado para indicar que al cancelar por autogestión se pierde la seña sin excepción.
- Backend de Cancelación de Clientes: Configurado para procesar la cancelación siempre con pérdida de seña (`withLossOfDeposit = true`).
- Corrección de Remitente de Correo (SMTP): Cambiado `getMailConfig` en `src/lib/email.js` para usar directamente una cadena formateada simple para el campo `from` en lugar de una estructura de objeto malformada. Esto resuelve los errores de SMTP que tachaban a la cuenta de origen como inexistente.
- Reemplazo de Logo: Actualizada la imagen corporativa del logo en `public/logo.png` con la versión de letras negras provista por el cliente (`letras negras.png`).

## [1.0.0] - 2026-07-08
### Added
- Transición a identificación por Email en Autogestión: Los clientes ingresan al portal de autogestión y reservan ingresando su Email en lugar de su DNI.
- DNI Opcional para nuevos clientes en la reserva online.
- Checkbox de Notificaciones por Cliente: Switch "Enviar notificaciones automáticas" en la ficha de cada cliente (creación y actualización) para activar/desactivar todos los avisos de WhatsApp y correo a ese cliente.
- Badge visual en el panel de control administrativo indicando si un cliente posee las notificaciones desactivadas.
- Switch Global de Notificaciones: Control central en el panel de notificaciones para pausar o reactivar todas las alertas automáticas del sistema (útil para períodos de migración de datos).
- Comprobación centralizada en todas las APIs de notificaciones (webhook de Mercado Pago, creación de turnos manuales, cancelaciones, reprogramaciones y cron diario de recordatorios) que verifica las configuraciones globales y del cliente antes de despachar mensajes.

## [0.12.0] - 2026-07-08
### Added
- Soporte para DNI opcional en creación y edición de clientes y reservas manuales. Los valores vacíos de DNI se guardan como `null` en la base de datos para evitar colisiones por clave única duplicada.
- Formateo visual del teléfono del cliente (`🇦🇷 +54 9 [celular_local]`) en la tabla de clientes, detalles de turno y autocompletado del panel administrativo.

### Fixed
- Solución al borrado de descuentos y señas al reprogramar o editar turnos desde la administración, inicializando correctamente las propiedades y evitando la sobreescritura automática por `useEffect` si el valor fue modificado manualmente.
- Corrección de notificaciones de WhatsApp para clientes creados administrativamente sin dirección de email (que poseen emails con prefijo `bloqueo-`). Los correos siguen omitiéndose para evitar rebotes, pero los mensajes de WhatsApp se despachan correctamente.

## [0.11.0] - 2026-07-08
### Added
- Limpieza automática de pre-reservas expiradas `PENDIENTE_PAGO` online tras 15 minutos de inactividad, integrada en endpoints de disponibilidad, creación y reprogramación.
- Fallback para plantillas de WhatsApp (cancelación, reprogramación y confirmación manual) si los valores no se encuentran inicializados en la base de datos de configuraciones.
- Retry de notificaciones (WhatsApp/Email) en la confirmación de la reserva si el intento inicial no finalizó en estado `ENVIADO`.

### Fixed
- Recorte visual dinámico de prefijos telefónicos `54` / `549` en los modales de clientes y agendamiento para evitar duplicaciones molestas al editar.
- Solución al reinicio de la fecha de la agenda al cerrar modales, manteniendo la fecha y semana seleccionadas y eliminando la recarga completa de página (`window.location.reload()`).
- Diálogos de confirmación de cancelaciones administrativas mejorados en dos pasos (confirmar cancelación -> confirmar preservación de seña).

## [0.10.0] - 2026-07-07
### Added
- Nuevo flujo de autogestión de clientes en el portal público (`src/app/page.js`): al ingresar DNI, si el cliente posee un turno activo, se le presenta la pantalla de detalles y las acciones de cancelación y reprogramación.
- API endpoints de autogestión de reservas para clientes: `/api/reservas/cancelar` (POST) y `/api/reservas/reprogramar` (POST).
- Recordatorio automático de 7 días (vía correo electrónico) integrado en el cron diario a las 10:00 AM en `src/lib/whatsapp.js`.
- Configuración de nuevas plantillas de email (7 días) y WhatsApp (Cancelación y Reprogramación) editables desde el panel de control.
- Envío automático de notificaciones de WhatsApp ante reprogramaciones y cancelaciones realizadas desde el panel de administración.
- Filtro estricto anti-bloqueos en notificaciones de actualización para evitar correos de rebote (bounce mail) en turnos bloqueados.
- Notificaciones automáticas de confirmación de WhatsApp integradas dentro del webhook de pago aprobado de MercadoPago (`src/app/api/webhooks/mercadopago/route.js`).
- API endpoint `/api/reservas/confirmar` (POST) para procesar la confirmación interactiva del cliente tras volver de MercadoPago.
- Botón "Confirmar y Cargar Turno 🚀" interactivo en la pantalla de éxito de reservas (`/booking/success`).

### Fixed
- Solución al scroll horizontal de la agenda semanal en móviles: scroll bidireccional puro en `.calendarContainer` y adhesión 2D sticky en cabeceras y columna de horas en `agenda.module.css`.
- Desencimamiento de botones de navegación e indicación de fecha en el calendario a través de un contenedor píldora `.navigationWrapper` que previene el desborde y la superposición.
- Hiding del menú hamburguesa y barra lateral mediante inyección de CSS global en `SidebarNav.js` en la ruta `/admin/agenda/imprimir` para lograr capturas limpias para impresión y PDF.
- Aumento de la ventana de la política de seña a **72 horas** de anticipación (reemplazando la regla de 24 horas) en frontend y backend.
- Exclusión estricta de reservas para el mismo día (mínimo a partir de mañana) y fines de semana (sábados y domingos) en el calendario público y APIs.
- Envío diferenciado de correos de cancelación: seña retenida por cancelación menor a 72hs vs seña conservada por cancelación mayor a 72hs.
- Obligatoriedad de DNI en creación/edición de clientes y reservas manuales.
