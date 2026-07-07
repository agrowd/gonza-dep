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
