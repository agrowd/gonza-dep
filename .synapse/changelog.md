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
