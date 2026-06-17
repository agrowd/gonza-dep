# workcycle.md - Registro de Trabajo de la Sesión

## 📅 Sesión: 16 de Junio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Extraer texto del documento `AppWeb Agenda.docx` para análisis.
- [x] Inicializar el Ariadne Engine (`.synapse/` y estructura base).
- [x] Extraer y verificar logotipo/imágenes de la marca desde el docx.
- [x] Crear análisis de requerimientos detallado y diagramas de flujo.
- [x] Confirmar con el usuario la arquitectura técnica y el uso de Next.js.
- [x] Registrar detalles de despliegue en VPS Debian y base de datos PostgreSQL.
- [x] Convertir el DOCX original a un archivo Markdown raíz estructurado `AppWeb_Agenda.md`.
- [x] Inicializar el proyecto con Next.js y Prisma.
- [x] Crear e integrar backend de autenticación administrativa (login/logout/session).
- [x] Crear e integrar el servicio de notificaciones con whatsapp-web.js (headless Puppeteer).
- [x] Crear e integrar el servicio de MercadoPago y su endpoint Webhook.
- [x] Diseñar interfaz y layouts en CSS puro (Paso 5).

### 📝 Notas / Bitácora
- **12 de Junio**: Extracción de requerimientos, imágenes, e inicialización del motor Ariadne. Elaboración del primer borrador del plan de implementación.
- **16 de Junio (09:20 AM)**: El usuario confirma el uso de inicio de sesión seguro (login) y el uso de `whatsapp-web.js` para enviar notificaciones automáticas y gratuitas.
- **16 de Junio (09:28 AM)**: El usuario informa que el despliegue se realizará en un VPS de DonWeb con Debian. Se documentan los requisitos adicionales de Debian en `env_manager.md` y se registran las decisiones en `decisions.md`.
- **16 de Junio (09:31 AM)**: El usuario confirma la integración real con MercadoPago para la seña. El plan de implementación se actualiza con los endpoints y detalles del Webhook de cobro.
- **16 de Junio (09:35 AM)**: El usuario solicita pasar el DOCX a Markdown conservando la estructura original. Se crea `convert_docx_to_md.py` para parsear negritas, listas y espaciados, generando el archivo [AppWeb_Agenda.md](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/AppWeb_Agenda.md).
- **16 de Junio (10:35 AM)**: Se inicia el Paso 4 de Integración del Backend.
  - Se definen y programan las utilidades de firma y verificación de tokens de sesión HTTP-only en `auth.js` de forma nativa sin dependencias externas.
  - Se estructuran las API Routes `/api/auth/login`, `/api/auth/logout`, y `/api/auth/session`.
  - Se configura la librería `whatsapp-web.js` en `whatsapp.js` usando la estrategia de autenticación persistente local (`.wwebjs_auth`) y configurando opciones óptimas de inicio para Puppeteer en Debian headless. Se estructuran las API Routes `/api/whatsapp/status` y `/api/whatsapp/logout`.
  - Se configura MercadoPago v2 SDK en `mercadopago.js` y se desarrolla el endpoint Webhook `/api/webhooks/mercadopago` para interceptar pagos exitosos de MercadoPago, actualizar los turnos en la base de datos a `PENDIENTE_AUTORIZACION`, registrar montos de seña y saldos, y emitir notificaciones internas.
  - El proyecto completo se pasa a formato nativo ES Modules (`type: module` en `package.json`), reescribiendo los archivos de lógica y el seed.
- **16 de Junio (11:30 AM)**: Se finaliza el Paso 5 de Diseño del Frontend.
  - Se desarrolla el Módulo de Estadísticas (Ruta `/admin/estadisticas` y API `/api/admin/estadisticas` para calcular ganancias diarias/semanales/mensuales, pérdidas detalladas por cancelaciones y ausencias, ingresos por tipo de cliente y ticket promedio).
  - Se desarrolla el Módulo de Notificaciones (Ruta `/admin/notificaciones` y API `/api/admin/notificaciones` para agrupar turnos semanales, previsualizar e interpolar variables en plantillas de recordatorio y gatillar el envío vía WhatsApp. Se suma `/api/whatsapp/qr-image` para renderizar el QR de vinculación).
  - Se desarrolla el Módulo de Configuración (Ruta `/admin/configuracion` y APIs de Zonas y `/api/admin/configuracion` para permitir el ABM de servicios/precios/tiempos, cambiar rangos de horarios laborales modificando la disponibilidad de turnos dinámicamente, y editar las plantillas).
  - Se corre un test de compilación (`npm run build`) para verificar la correcta integración de todos los componentes y APIs.
  - Se cambia el puerto por defecto de desarrollo y producción de 3000 a 3005 para evitar colisiones con otros servicios activos en el VPS.
  - Se crea y publica el script `deploy.sh` para automatizar completamente la instalación y recarga del panel en el servidor.
