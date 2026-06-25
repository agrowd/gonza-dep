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
