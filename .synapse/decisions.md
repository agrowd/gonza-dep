# decisiones.md - Registro de Decisiones Técnicas

| ID | Decisión Técnica | La Razón (The Why) | Estado |
|:---|:---|:---|:---|
| D-01 | **Uso de Python para parsear DOCX** | No se disponía de herramientas nativas para visualizar DOCX; se programó un script en python utilizando zipfile y xml.etree.ElementTree para extraer el contenido a markdown. | 🔒 LOCKED |
| D-02 | **Next.js como Framework** | Next.js permite desarrollar frontend interactivo (Agenda en calendario, buscador de clientes) y backend (API routes, base de datos con Prisma, envío de correos/notificaciones) en un solo proyecto, facilitando el despliegue en un VPS propio. | 🔒 LOCKED |
| D-03 | **VPS Debian DonWeb + PostgreSQL** | El cliente posee un VPS de DonWeb con Debian. Usaremos PostgreSQL para producción por ser robusto y nativo en el servidor, manteniendo SQLite en desarrollo local para agilidad. | 🔒 LOCKED |
| D-04 | **Autenticación en Panel de Control** | Se confirma la necesidad de un login seguro para evitar acceso no autorizado a los datos de los clientes en `/admin`. | 🔒 LOCKED |
| D-05 | **WhatsApp Automatizado con whatsapp-web.js** | Se prefiere el envío automatizado a través de whatsapp-web.js (Puppeteer) en lugar de links manuales de wa.me. El servidor en Debian VPS ejecutará el navegador headless y mostrará el código QR en `/admin/configuracion` para la vinculación. | 🔒 LOCKED |
| D-06 | **Notificación de Faltazos vía SMTP** | Se seleccionó Nodemailer configurado con variables de entorno SMTP para enviar correos transaccionales con plantilla HTML premium cuando se registra inasistencia (`NO_ASISTIO`). | 🔒 LOCKED |
| D-07 | **Buscador predictivo (Autocomplete) del lado del Cliente** | Se optó por cargar la lista de clientes completa en memoria al abrir el modal de agendado en `/admin/agenda` para realizar la búsqueda y autocompletado en el frontend, garantizando respuesta instantánea y simplicidad de diseño. | 🔒 LOCKED |
