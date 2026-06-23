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
  - Se agrega `.env.template` preconfigurado con valores de base de datos y clave secreta para acelerar la puesta en marcha.
  - Se añade un comando automático en `deploy.sh` para reescribir dinámicamente el provider de Prisma de SQLite a PostgreSQL en producción, solucionando el error de tipo de conexión P1013.
  - Se agrega el paso explícito `npx prisma generate` en `deploy.sh` para compilar los bindings del cliente de base de datos antes de la ejecución de Next.js y el seed.
  - Se modifica el comando de seed en `deploy.sh` a `npx prisma db seed` para garantizar la carga correcta del archivo `.env` en producción.

## 📅 Sesión: 18 de Junio de 2026

### 🎯 Tareas en curso / Objetivos
- [ ] Resolver el ruteo de subdominio de Nginx (`gonzalo.nextemarketing.com`).
- [ ] Generar certificado SSL con Certbot.

### 📝 Notas / Bitácora
- **18 de Junio (10:22 AM)**: Se retoma el trabajo tras una compactación. El usuario reporta que al acceder a `gonzalo.nextemarketing.com` se muestra la landing de Nexte en lugar de la agenda. Iniciamos diagnóstico de Nginx. Se descubrió que el sitio web principal `nextemarketing.com` ya estaba utilizando el puerto 3005. Se procedió a actualizar el puerto de la agenda a `3006` en el repositorio, modificar `deploy.sh` para recargar el puerto en PM2 de manera limpia, y empujar los cambios. Se proporcionan instrucciones detalladas al usuario para actualizar el VPS y reescribir Nginx.

- **19 de Junio (09:12 AM)**: El plan de mejoras y correcciones fue aprobado por el usuario. Iniciando la Fase 1: instalación de `nodemailer` y configuración de variables SMTP locales y en producción.
- **19 de Junio (12:20 PM)**:
  - Se completó la Fase 3:
    - Se aplicó encadenamiento opcional (`?.`) en todas las referencias a `app.cliente` y `selectedTurno.cliente` en `src/app/admin/agenda/page.js` para evitar fallos si no hay cliente asociado.
    - Se implementó la grilla horaria dinámica en `src/app/admin/agenda/page.js` cargando `work_start` y `work_end` desde `/api/admin/configuracion` y re-calculando las franjas horarias y la altura del contenedor `.dayColumn` correspondientemente.
  - Se completó la Fase 4:
    - Se integró el botón "+ Crear Nuevo Cliente" y el modal interactivo en `src/app/admin/clientes/page.js` conectado a `POST /api/admin/clientes`.
    - Se implementó el buscador predictivo (autocomplete) en el modal de agendado manual de `src/app/admin/agenda/page.js` conectado a la lista de clientes, autocompletando WhatsApp, Email e ID.
  - Se completó la Fase 5:
    - Se actualizó el endpoint de notificaciones `/api/admin/notificaciones` para soportar `week=2days`, filtrando exactamente el día `hoy + 2 días`.
    - Se agregó el botón "Turnos en 2 Días" en la botonera de `src/app/admin/notificaciones/page.js`.
    - Se creó el módulo de correo `src/lib/email.js` implementando una plantilla HTML premium con los colores de la marca para inasistencias.
    - Se interceptó el cambio de estado a `NO_ASISTIO` en `src/app/api/admin/turnos/[id]/route.js` para enviar automáticamente el correo SMTP de inasistencia.
  - Se verificó la compilación local mediante `npm run build` para garantizar cero fallos de SSR o ruteo en producción.

- **23 de Junio (10:15 AM)**:
  - El usuario proporciona las credenciales de un nuevo VPS en Hostinger (IP: `187.127.9.216`, SO: Ubuntu 24.04).
  - Se instaló la librería `ssh2` localmente para automatizar la configuración del servidor.
  - Se copiaron las claves públicas SSH locales al archivo `authorized_keys` del VPS para autorizar el acceso sin contraseña.
  - Se creó y ejecutó el script `setup_vps.sh` en el VPS, el cual instaló Node.js v20, Nginx, Certbot, PostgreSQL, dependencias del sistema de Puppeteer para WhatsApp Web JS, y PM2.
  - Se configuró la base de datos PostgreSQL creando el usuario `gonzalo_admin` y la base de datos `agenda_db`.
  - Se clonó el repositorio en `/srv/gonzalo-dep` en el VPS.
  - Se subió y configuró el archivo de variables de entorno `.env` en producción.
  - Se ejecutó con éxito el script `./deploy.sh` que instaló dependencias, sincronizó el esquema Prisma, ejecutó el seed, compiló el bundle Next.js de producción y levantó el proceso en PM2 (`gonzalo-agenda`).
  - Se reescribió la configuración predeterminada de Nginx en `/etc/nginx/sites-available/default` para actuar como proxy inverso desde el puerto 80 al puerto local 3006 de la aplicación.
  - Se verificó mediante un `curl` de prueba que el sitio responde correctamente con un código de estado HTTP 200 OK.

- **23 de Junio (11:06 AM - 1:06 PM)**:
  - Se detecta que el logo de marca (`public/logo.png`) estaba subido pero NO integrado en la interfaz. Todas las páginas seguían mostrando la letra "G" en un círculo.
  - Se reemplazó el placeholder "G" por la imagen real `/logo.png` en 5 vistas clave (login, sidebar de admin, página de reserva, páginas de éxito y fallo).
  - Se corrigió el renderizado de las Indicaciones Previas en la reserva online, reemplazando la sintaxis `**` de markdown por etiquetas `<strong>` HTML en `src/app/page.js`.
  - Se subieron los archivos modificados de código y documentación directamente al VPS a través de SCP.
  - Se ejecutó con éxito el script `./deploy.sh` en el VPS, que recompiló la aplicación en producción (28/28 páginas) y reinició el proceso PM2 `gonzalo-agenda` en el puerto 3006.
  - Se verificó mediante pruebas de `curl` directas al puerto 3006 y al puerto 80 (Nginx Proxy) que la aplicación responde correctamente con HTTP 200 OK.

- **23 de Junio (1:11 PM - 1:16 PM)**:
  - El usuario agregó exitosamente el registro DNS tipo A para el subdominio `agenda` apuntando a `187.127.9.216` en su panel de Hostinger.
  - Se constató la propagación de DNS consultando contra el servidor público `8.8.8.8`.
  - Se modificó la configuración de Nginx en `/etc/nginx/sites-available/default` en el VPS para asignar `server_name agenda.depilacionparahombres.com;` y se recargó Nginx.
  - Se corrió Certbot (`certbot --nginx -d agenda.depilacionparahombres.com`) para registrar y desplegar el certificado SSL (HTTPS) de Let's Encrypt y habilitar redirección HTTP -> HTTPS de forma automática.
  - Se validó el correcto funcionamiento de HTTPS respondiendo con HTTP 200 OK.

- **23 de Junio (1:50 PM - 1:55 PM)**:
  - El usuario suministró un nuevo logotipo oficial circular con diseño de color rojo y la letra "G" en gris.
  - Se sobreescribió el archivo de logo (`public/logo.png`) y el favicon (`src/app/favicon.ico`) en el repositorio local.
  - Se transfirieron ambos recursos directamente al VPS a través de SCP.
  - Se completó con éxito la recompilación del proyecto Next.js en el servidor a través de `./deploy.sh`, empaquetando el nuevo favicon y logo de forma definitiva y reiniciando el servicio bajo PM2.

- **23 de Junio (2:06 PM - 2:10 PM)**:
  - El usuario suministró una nueva versión del logotipo circular con fondo transparente.
  - Se sobreescribió el logo (`public/logo.png`) y el favicon (`src/app/favicon.ico`) locales y se subieron al VPS mediante SCP.
  - Se completó con éxito la recompilación del proyecto Next.js en el servidor a través de `./deploy.sh`, integrando el favicon y logo transparentes y reiniciando el servicio bajo PM2.

- **23 de Junio (7:14 PM - 7:24 PM)**:
  - El usuario reportó que la página `/admin/agenda` crasheaba con la pantalla de error "This page couldn't load" después de iniciar sesión.
  - Se revisaron los registros de Nginx y PM2, constatando que la consulta HTTP 200 era exitosa pero el navegador de los clientes crasheaba en renderizado de React.
  - Se identificó que la llamada a `pathname.startsWith()` en `src/app/admin/SidebarNav.js` fallaba con `TypeError` porque `usePathname()` de Next.js retorna `null` durante la fase inicial de hidratación/SSR.
  - Se implementó un control condicional en `SidebarNav.js` (`pathname ? pathname.startsWith(...) : false`) para prevenir la excepción.
  - Se subió el archivo modificado por SCP y se ejecutó `./deploy.sh` en el VPS, finalizando el despliegue con éxito.

- **23 de Junio (7:28 PM - 7:35 PM)**:
  - Se subió el archivo `src/app/admin/error.js` al VPS mediante SCP.
  - Se ejecutó el despliegue (`deploy.sh`) exitosamente en el servidor, reiniciando el servicio de PM2 `gonzalo-agenda` en el puerto 3006.
  - Se solicitó al usuario recargar la página `/admin/agenda` para capturar la traza del error en el cliente a través del nuevo Error Boundary.

- **23 de Junio (7:36 PM - 7:42 PM)**:
  - El usuario compartió la traza de error arrojada por el Error Boundary: `ReferenceError: zonasText is not defined` en `src/app/admin/agenda/page.js`.
  - Se identificó un error tipográfico en `src/app/admin/agenda/page.js` donde se declaró `zonesText` pero se intentó renderizar `zonasText`.
  - Se corrigió el typo renombrando `zonesText` a `zonasText` para mantener la consistencia.
  - Se subió `src/app/admin/agenda/page.js` al VPS vía SCP y se ejecutó `./deploy.sh` de forma exitosa en producción.
- **23 de Junio (7:45 PM - 7:57 PM)**:
  - El usuario reportó que al intentar reservar un turno como cliente, al llegar al paso de Mercado Pago, este no se abría.
  - Se revisaron los logs de PM2 en el VPS (`gonzalo-agenda-error.log`), encontrando que la API `/api/reservas/crear` fallaba con: `auto_return invalid. back_url.success must be defined`.
  - Esto ocurría porque Mercado Pago requiere URLs de retorno HTTPS públicas y válidas cuando `auto_return` está habilitado. En el `.env` del VPS, `NEXT_PUBLIC_APP_URL` apuntaba a `http://187.127.9.216:3006`.
  - Se modificó localmente `scratch/.env.production` asignando `NEXT_PUBLIC_APP_URL="https://agenda.depilacionparahombres.com"`.
  - Se transfirió el archivo al VPS por SCP a la ruta `/srv/gonzalo-dep/.env` y se ejecutó `./deploy.sh` para reconstruir el bundle de producción y reiniciar PM2.
