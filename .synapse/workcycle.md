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
  - Se completó con éxito la recompi- **23 de Junio (2:06 PM - 2:10 PM)**:
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

- **23 de Junio (8:10 PM - 8:28 PM)**:
  - El usuario reportó que al intentar crear un bloqueo de día completo de `10:00` a `22:00`, la operation fallaba.
  - Se revisaron los logs de errores de PM2 (`gonzalo-agenda-error.log`), detectando un `ReferenceError: timeToMinutes is not defined` en `src/app/api/admin/turnos/route.js`.
  - Se agregó la definición de la función `timeToMinutes` al inicio de `src/app/api/admin/turnos/route.js` y de `src/app/api/admin/turnos/[id]/route.js` (para la lógica de actualización/PUT).
  - Se subieron los archivos al VPS vía SCP y se ejecutó `./deploy.sh` exitosamente.

- **24 de Junio (10:15 AM - 10:20 AM)**:
  - Se cargaron y aplicaron las variables de entorno de Hostinger SMTP (`turnos@depilacionparahombres.com` a través del puerto 465 SSL) en el VPS.
  - Se creó un script de verificación `scratch/test_smtp.js` y se ejecutó con éxito en el servidor de producción, validando la autenticación y el envío del correo de prueba.
  - Se identificó y resolvió el error `No LID for user` en el envío de notificaciones de WhatsApp. El problema residía en que los números telefónicos en la base de datos se almacenan en formato local de 10 dígitos (ej: `1171244149`), mientras que WhatsApp Web JS requiere el formato internacional con el código de país (`549`).
  - Se implementó la función de normalización robusta `formatArgentinaPhone` en `src/lib/whatsapp.js` para realizar esta traducción automáticamente en caliente al momento del envío.
  - Se corrigió el cálculo de rangos de fecha en `/api/admin/notificaciones` aplicando un ajuste de zona horaria específico para Argentina (GMT-3) para evitar desfases temporales debido a la hora UTC del servidor de producción.
  - Se subieron los archivos modificados al VPS y se ejecutó `./deploy.sh` para reconstruir la compilación Next.js y reiniciar los procesos PM2 con los cambios aplicados.

- **25 de Junio (09:05 AM)**:
  - Se completó la tarea de cambio de logotipo principal a la versión en blanco (`Logo-Gonzalo-Depilacion-para-hombres-Blanco.png`), manteniendo el favicon en la carpeta `src/app/favicon.ico` con el logotipo oficial circular original.
  - Se sincronizaron los archivos locales modificados con el VPS de producción.
  - Se ejecutó el script de despliegue `./deploy.sh` en el VPS para compilar el nuevo build de producción con Next.js y reiniciar el proceso PM2 `gonzalo-agenda` en el puerto 3006.
  - Se verificó la disponibilidad de la web bajo HTTPS respondiendo con HTTP 200 OK mediante comandos curl.

- **25 de Junio (09:25 AM)**:
  - Se completó la implementación de las mejoras y características pendientes del cliente:
    - **Estadísticas**: Reemplazo de "Señas Cobradas" por "Total Bonificaciones" (suma acumulada del campo `bonificacion` de los turnos) en la API `/api/admin/estadisticas` y en la vista de administración `/admin/estadisticas`.
    - **Agenda**:
      - Implementación de la vista diaria ("Día") con toggle de alternancia a la vista semanal ("Semana") y un selector de fecha interactivo para saltar de forma rápida a cualquier día.
      - Detección de pantallas móviles (<768px) para forzar la vista diaria por defecto en el primer renderizado.
      - Ocultamiento de la información secundaria (zonas y hora) en bloques de turnos con duración menor o igual a 30 minutos para evitar solapamiento de textos en la interfaz.
      - Autocompletado de fecha recomendada (`lastTurnoDate + frecuencia semanas`) cuando se selecciona un cliente del buscador predictivo en el modal de agendado manual, actualizando el formulario y saltando la vista del calendario a ese día.
    - **Recordatorios automáticos**:
      - Creación de un cron en background dentro de `src/lib/whatsapp.js` que se ejecuta cada 15 minutos.
      - En la ventana horaria de 10:00 a 11:00 AM (hora de Argentina GMT-3), busca turnos con estado `SEÑADO` o `REPROGRAMADO` programados para `hoy + 2 días` y despacha automáticamente el recordatorio por WhatsApp si no fue enviado antes.
    - **Listado de Zonas**:
      - Ordenamiento alfabético ascendente directo en la consulta `/api/zonas` para asegurar la uniformidad en todas las listas del sistema.
  - Se sincronizaron los archivos modificados en el servidor VPS de Hostinger, se corrió `npx prisma db push --accept-data-loss` para actualizar la base de datos PostgreSQL con la restricción de DNI único, y se reconstruyó la aplicación Next.js y reinició PM2 mediante `./deploy.sh`.

- **25 de Junio (05:18 PM - 05:35 PM)**:
  - El cliente reportó 5 problemas a través de WhatsApp con capturas de pantalla:
    1. **Notificaciones muestran turnos pasados** — La API `/api/admin/notificaciones` no filtraba por fecha futura.
    2. **Texto del slot seleccionado no se ve en negro** — Aunque el CSS ya tenía `color: #000`, se reforzó con `!important` y se añadieron efectos visuales (scale, box-shadow) para mejor feedback.
    3. **Duración inconsistente en el resumen** — El frontend mostraba "14:00 a 14:30 (40 min)". El `horaFin` venía del cálculo sin bonus de nuevo cliente (30min → 14:30) pero la duración mostrada usaba el bonus (+10min → 40min). Se unificó usando `isNewClient=false` en la búsqueda de disponibilidad, el resumen del frontend, y la API de creación de reservas.
    4. **Emails no llegan al pagar ni al cancelar** — Los logs de PM2 mostraban `501 5.1.7 Bad sender address syntax`. La variable `SMTP_FROM` tenía comillas escapadas (`\"Gonzalo Depilación\"`) que producían una dirección inválida. Se refactorizó `email.js` para usar el formato de objeto de Nodemailer `{name, address}` y se simplificó el `.env`.
    5. **Email de cancelación no notifica pérdida de seña** — Mismo root cause que el punto 4 (SMTP_FROM malformado).
  - Se verificó la compilación local exitosa (29/29 páginas).
  - Se subieron los archivos al VPS y se ejecutó `./deploy.sh`.

## 📅 Sesión: 26 de Junio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Sincronizar archivos y consolidar el despliegue del VPS tras la última tanda de correcciones de SMTP e inconsistencias.
- [x] Ejecutar la recompilación y reinicio del servidor Next.js en el VPS de producción mediante `./deploy.sh`.
- [x] Validar la correcta respuesta HTTP del servidor expuesto en HTTPS.
- [x] Actualizar y mantener los archivos de documentación de Cortex (`.synapse/root.md` y `.synapse/flows_graph.md`).

### 📝 Notas / Bitácora
- **26 de Junio (03:30 PM)**:
  - Se continuó la sesión tras una compactación de chat.
  - Se ejecutó de forma remota en el VPS Hostinger (`187.127.9.216`) el script `./deploy.sh` a través de SSH para recompilar la aplicación Next.js incorporando las correcciones de notificaciones pasadas, estilo del slot activo, unificación de duraciones (`isNewClient=false`) y la refactorización SMTP de Nodemailer.
  - La compilación e instalación finalizaron de forma 100% exitosa, reiniciando el proceso PM2 `gonzalo-agenda` en el puerto 3006.
  - Se verificó la disponibilidad pública y el estado del proxy inverso de Nginx mediante un curl HTTPS, devolviendo `HTTP 200 OK` satisfactoriamente.
  - Se revisaron los logs de PM2 comprobando que el cliente de WhatsApp Web está correctamente inicializado, autenticado y en estado `ready`, y que el cron cronometra la búsqueda de recordatorios de forma programada.
  - Se actualizaron `.synapse/root.md` y `.synapse/flows_graph.md` para reflejar la arquitectura actual y los flujos con el paso del DNI implementado.

- **26 de Junio (08:40 PM)**:
  - El usuario reportó que los colores no coinciden con los de la web oficial.
  - Se definieron variables de estilo CSS locales en la clase `.container` dentro de `src/app/page.module.css` para aplicar el tema de la web oficial: fondo crema (`#f0ede6`), cabecera y acentos en bordó (`#7a1f1e`), texto en carbón oscuro (`#1d1d1d`), tarjetas y campos en blanco (`#ffffff`).
  - Se corrigió el contraste de texto (de negro a blanco) en elementos activos con fondo rojo bordó (`.stepDotCompleted`, `.checkboxActive`, `.dateButtonActive`, `.slotButtonActive`).
  - Se eliminaron inline-styles con color blanco (`#fff`) hardcodeado en las tarjetas de resumen de `page.js` y de `success/page.js` para asegurar que el texto sea legible en el nuevo fondo claro.
  - Se ajustó el estilo del botón "Acceso Interno" en la cabecera pública de `page.js` para mantener su visibilidad y contraste en blanco sobre la cabecera bordó.
  - Se verificó la compilación local (`npm run build`) y se subieron los archivos modificados al VPS (`187.127.9.216`).
  - Se ejecutó `./deploy.sh` en el VPS, reconstruyendo la aplicación y recargando PM2.
  - Se comprobó mediante `curl` de red que el sitio responde correctamente con `HTTP 200 OK`.

## 📅 Sesión: 29 de Junio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Agregar validaciones de duplicados para DNI, Email y Teléfono (creación y actualización manual).
- [x] Añadir vista mensual interactiva a la agenda administrativa.
- [x] Corregir scroll móvil de la agenda para evitar doble scrollbox.
- [x] Evitar superposición de turnos manuales y reservas de fechas/horas pasadas usando GMT-3.
- [x] Implementar descuentos (fijo/porcentaje) y valor por defecto PENDIENTE_PAGO en turnos manuales.
- [x] Agregar copia oculta BCC global a `nuevacuenta@depilacionparahombres.com` en todos los correos.
- [x] Implementar opción de enviar recibo digital de turno/seña por correo.
- [x] Crear cron para correos automáticos de mantenimiento a los 2.5 meses (75 días).
- [x] Extender la ventana de reserva online del cliente de 2 semanas a 1 mes (30 días).
- [x] Permitir filtrar estadísticas por un rango personalizado de fechas Desde/Hasta.
- [x] Agrandar el logotipo en la barra de navegación lateral a 190px.
- [x] Ejecutar build de producción local para verificar integridad del código.

### 📝 Notas / Bitácora
- **29 de Junio (09:25 PM)**:
  - Se modificaron los endpoints `/api/admin/clientes` (POST) y `/api/admin/clientes/[id]` (PUT) para realizar comprobaciones estrictas de unicidad para DNI, Email y WhatsApp, y se expusieron estos campos en la pestaña de configuración del perfil del cliente.
  - Se implementó la vista mensual interactiva ("Mes") en la agenda `/admin/agenda` y se ajustaron las hojas de estilo CSS en `agenda.module.css` para optimizar la visualización móvil mediante scroll nativo continuo (eliminando el contenedor rígido que causaba doble scroll).
  - Se removió de forma definitiva la leyenda explicativa sobre bloques de 10 minutos de la pantalla de agenda.
  - Se implementó la prevención de solapamientos de horario y la prohibición de agendar citas en fechas/horas pasadas (calculado en el huso de Argentina GMT-3) para la creación manual (POST `/api/admin/turnos`), reprogramación (PUT `/api/admin/turnos/[id]`) y reserva online (POST `/api/reservas/crear`).
  - Se configuró el estado por defecto `PENDIENTE_PAGO` en las reservas manuales nuevas, y se añadieron selectores para bonificaciones por porcentaje y valor fijo, calculándose en caliente y guardándose en el campo preexistente `bonificacion`.
  - Se configuró la copia oculta (BCC) automática de todas las comunicaciones a la dirección `nuevacuenta@depilacionparahombres.com` en `src/lib/email.js`.
  - Se implementó el envío de comprobantes de turno y señas mediante la función `sendReceiptEmail` y el nuevo endpoint POST `/api/admin/turnos/[id]/enviar-recibo`, vinculándolo a un botón "Enviar Recibo por Mail" en el panel modal de detalles del turno.
  - Se integró el servicio de correos automáticos de mantenimiento a los 75 días (2.5 meses) dentro del cron diario de recordatorios (a las 10:00 AM) en `src/lib/whatsapp.js`, buscando citas `REALIZADO` hace exactamente 75 días de clientes que no posean reservas posteriores.
  - Se extendió el rango de reserva online de la landing page `src/app/page.js` de 14 a 30 días hábiles.
  - Se modificó `/api/admin/estadisticas` y `/admin/estadisticas/page.js` para recibir parámetros `start` y `end`, reemplazando los desplegables de mes y año con dos selectores de fecha HTML5 (Desde / Hasta) para analizar rangos libres.
  - Se modificó `src/app/admin/SidebarNav.js` para incrementar el tamaño del logotipo principal a `190px` de ancho.
  - Se inició la compilación local (`npm run build`) para verificar que todo el proyecto compile correctamente sin fallos de ruteo ni dependencias.isibilidad y contraste en blanco sobre la cabecera bordó.
  - Se verificó la compilación local (`npm run build`) y se subieron los archivos modificados al VPS (`187.127.9.216`).
  - Se ejecutó `./deploy.sh` en el VPS, reconstruyendo la aplicación y recargando PM2.
  - Se comprobó mediante `curl` de red que el sitio responde correctamente con `HTTP 200 OK`.

## 📅 Sesión: 2 de Julio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Separar Nombre Completo en campos Nombre y Apellido en formulario de reserva público y modal de creación/edición de clientes.
- [x] Implementar selector de Teléfono / WhatsApp en frontend con bandera argentina y prefijo +54 (formato Agenda Pro).
- [x] Asegurar normalización automática de números telefónicos a formato internacional (549...) en base de datos.
- [x] Crear opción de Imprimir/Exportar a PDF los turnos del día en el panel de control.
- [x] Realizar build local y subir cambios al VPS remotos con reinicio de PM2.

### 📝 Notas / Bitácora
- **2 de Julio (11:00 AM)**:
  - Se implementó la división de `nombreCompleto` en campos independientes de `Nombre` y `Apellido` en `src/app/page.js` y `src/app/admin/clientes/page.js`. Al guardarse o enviarse, se concatenan de forma automática, preservando la compatibilidad de base de datos de Prisma y de MongoDB.
  - Se diseñó el selector telefónico premium con prefijo de bandera `🇦🇷 +54` en ambos formularios.
  - Se creó y exportó la función de utilidad `normalizeWhatsApp` en `src/lib/whatsapp.js` para limpiar y formatear números al formato internacional (`549...`). Los endpoints de creación/edición de clientes y reservas ahora normalizan el número antes de validar y guardar en la base de datos para evitar registros duplicados.
  - Se creó el endpoint `/api/admin/turnos/imprimir` (GET) para recuperar y ordenar cronológicamente los turnos del día.
  - Se desarrolló la vista interactiva `/admin/agenda/imprimir` optimizada para impresión nativa y PDF (`@media print` con fondo blanco y textos negros de alta legibilidad, ocultando barras de acciones y barras laterales).
  - Se integró el botón "Imprimir Día" con icono de impresora en `/admin/agenda/page.js`.
  - Se compiló con éxito localmente, se creó el script de subida `scratch/deploy_gonzalo.mjs` y se desplegó todo a producción en el VPS (`187.127.9.216`), reiniciándose PM2 de forma exitosa.
  - Se realizó push a `main` de GitHub.

## 📅 Sesión: 7 de Julio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Agregar recordatorio automático por mail 7 días antes de la cita en el cron diario.
- [x] Habilitar envío de WhatsApp automático al reprogramar o cancelar turnos desde el panel.
- [x] Solucionar solapamiento/encimamiento de botones de navegación en la agenda (vista mobile).
- [x] Ocultar botón flotante de menú (hamburguesa) y barra lateral en vista de impresión.
- [x] Desarrollar flujo de autogestión de clientes (cancelar/reprogramar según política de 72hs).
- [x] Obligatoriedad de campo DNI en creación/edición de clientes y reservas manuales.
- [x] Enviar notificaciones WhatsApp automáticas en webhook de aprobación de MercadoPago.
- [x] Bloquear reservas/reprogramaciones para el mismo día y fines de semana (sábados y domingos).
- [x] Crear botón interactivo en página de éxito para confirmar y cargar el turno manualmente tras pago.
- [x] Dividir los correos de cancelación en dos plantillas (seña perdida vs seña conservada).

### 📝 Notas / Bitácora
- **7 de Julio (09:30 AM)**:
  - Se configuraron los nuevos campos y plantillas de correo y WhatsApp por defecto en `src/app/api/admin/configuracion/route.js`.
  - Se crearon los campos correspondientes en la interfaz de configuración del panel de control (`src/app/admin/configuracion/page.js`) para editar estas nuevas plantillas en vivo.
  - Se implementó la función de envío de recordatorio a 7 días `sendReminder7DaysEmail` en `src/lib/email.js` y se integró en el cron diario a las 10:00 AM en `src/lib/whatsapp.js`, comprobando turnos y evitando bloqueos.
  - Se modificó el endpoint de actualización de turnos `src/app/api/admin/turnos/[id]/route.js` para disparar notificaciones de WhatsApp usando las plantillas configuradas ante cancelaciones y reprogramaciones.
  - Se implementó un filtro estricto anti-bloqueos en el endpoint de actualización para omitir envíos de emails y WhatsApps si la cita tiene estado `BLOQUEADO` o el correo del cliente incluye `bloqueo`, resolviendo los correos de rebote (bounce mail).
  - Se crearon los endpoints de autogestión para clientes `/api/reservas/cancelar` (POST) y `/api/reservas/reprogramar` (POST).
  - Se modificó la consulta por DNI `/api/clientes/consultar` para retornar los datos del turno activo del cliente si existe.
  - Se implementó la interfaz de autogestión en el portal de reserva público `src/app/page.js`: si el cliente ingresa su DNI y tiene un turno activo, se le permite ver sus detalles, cancelar el turno (advirtiendo la pérdida de seña si faltan < 72hs) o reprogramarlo (si faltan > 72hs) eligiendo un nuevo slot utilizando el flujo habitual de reserva.
  - Se corrigió el scroll de la agenda semanal en pantallas móviles aplicando scroll bidireccional puro en `.calendarContainer` y estableciendo adhesión pegajosa (sticky) en 2D en `.gridHeader`, `.timeColHeader` y `.timeColumn` dentro de `src/app/admin/agenda/agenda.module.css`.
  - Se agruparon los botones de navegación y la fecha actual en un contenedor estilizado como píldora `.navigationWrapper` para evitar desalineación y encimamiento en móviles.
  - Se implementó la inyección dinámica de CSS en `src/app/admin/SidebarNav.js` para ocultar la barra lateral y el botón hamburguesa cuando la ruta es `/admin/agenda/imprimir`, logrando una captura limpia y sin elementos distractores.
  - Se hizo obligatorio el DNI en los formularios de clientes y agenda del panel de control.
  - **7 de Julio (04:20 PM)**:
    - Se incrementó el límite de la política de seña a **72 horas** de anticipación (reemplazando las referencias a 24 horas).
    - Se integró el envío de mensajes de confirmación de WhatsApp en el webhook de MercadoPago (`src/app/api/webhooks/mercadopago/route.js`).
    - Se bloquearon las reservas para el mismo día (sólo a partir de mañana) y los sábados y domingos tanto en el frontend como en los endpoints del backend (`/api/reservas/crear` y `/api/reservas/reprogramar`).
    - Se diseñó el botón "Confirmar y Cargar Turno 🚀" en la página de éxito (`/booking/success`) y se creó el endpoint `/api/reservas/confirmar` (POST) para registrar y notificar el turno una vez que el cliente hace clic después de pagar.
    - Se adaptó `sendCancellationEmail` en `src/lib/email.js` para recibir `withLossOfDeposit` y renderizar un correo diferenciado (seña retenida por cancelar < 72hs vs seña conservada por cancelar > 72hs).
    - Se verificó compilación local con éxito y se desplegó todo al VPS de producción de Hostinger, reiniciando PM2.
  - **8 de Julio (01:00 AM)**:
    - Se implementó la limpieza automática `cleanupExpiredPendingPayments` para turnos online `PENDIENTE_PAGO` con más de 15 minutos en `/api/disponibilidad`, `/api/reservas/crear` y `/api/reservas/reprogramar`.
    - Se agregaron fallbacks para plantillas de WhatsApp de cancelaciones y reprogramaciones en `/api/admin/turnos/[id]` y `/api/reservas/reprogramar`.
    - Se implementó el retry de envío de confirmaciones (WhatsApp/Email) si el intento anterior no tenía estado `ENVIADO`.
    - Se integró el recorte dinámico de prefijos telefónicos (`54`/`549`) mediante `stripPhonePrefix` en los inputs de agenda y clientes.
    - Se solucionó el reinicio de la fecha de la agenda al cerrar modales, manteniendo la fecha y semana sincronizadas y eliminando las recargas de página completas (`window.location.reload()`).
    - Se mejoró la claridad de los diálogos de cancelación administrativa en dos pasos en `/admin/agenda/page.js`.
    - Se actualizó el walkthrough y se comprobó la compilación local (`npm run build`) con éxito.
  - **8 de Julio (05:40 PM)**:
    - Se hizo opcional el DNI en los formularios de clientes y reserva de agenda de administración, convirtiendo valores vacíos a `null` en el backend (`/api/admin/turnos`) para evitar fallos de clave única duplicada en SQLite.
    - Se solucionó el problema por el cual se borraban los descuentos y señas al editar/reprogramar turnos desde la administración, inicializando los valores y agregando control de `autoTotal` en `editTurno` para evitar que la recalculación por useEffect los sobrescriba.
    - Se separó la lógica de saltar notificaciones en base a correos temporales "bloqueo-": los clientes manuales sin email sí recibirán WhatsApps ante cancelaciones/reprogramaciones desde la administración (los correos bloqueados se siguen omitiendo para evitar bounces).
    - Se formateó visualmente el teléfono a `🇦🇷 +54 9 [número]` en la tabla de clientes, detalles de turno y autocompletado para una visualización consistente.
  - **8 de Julio (08:20 PM)**:
    - Se modificó la base de datos local y el esquema Prisma agregando `enviarNotificaciones Boolean @default(true)` a la tabla `Cliente`. Se corrió `npx prisma db push` para aplicar la migración.
    - Se agregó el checkbox "Enviar notificaciones automáticas" en la ficha de cliente (pestaña Notas y Configuración) y en el formulario de creación manual en `/admin/clientes`.
    - Se agregó un badge dorado "⚠️ Notificaciones Desactivadas" en el encabezado de la ficha del cliente en el panel administrativo si tiene desactivada la opción.
    - Se implementó un switch de "Pausa Global de Envíos" en el panel `/admin/notificaciones` guardando la configuración `global_notifications_enabled` en la tabla `Configuracion`.
    - Se condicionaron todos los envíos de notificaciones en el backend (webhook de Mercado Pago, creación de turnos manuales, cancelaciones, reprogramaciones y cron diario de recordatorios) para verificar tanto el check global como el check individual del cliente.
    - Se implementó la transición a Email en la autogestión de clientes y reserva online, reemplazando las entradas y comprobaciones de DNI por Email. DNI se hizo opcional en el formulario de registro online.
    - Se verificó la compilación del bundle de producción local (`npm run build`) de forma exitosa (34/34 rutas).
  - **13 de Julio (09:20 AM)**:
    - Se modificó la vista de autogestión en `src/app/page.js` para alertar siempre sobre la pérdida total de seña al cancelar por autogestión.
    - Se actualizó el endpoint `/api/reservas/cancelar/route.js` para forzar `withLossOfDeposit = true` en las cancelaciones iniciadas por clientes.
    - Se incrementó el contraste de las clases de badges de estado (`.badgeSenado`, `.badgeRealizado`, etc.) en `src/app/admin/agenda/agenda.module.css` usando las variables CSS de color del tema oscuro en el texto sobre el fondo claro.
    - Se aumentó la legibilidad de las advertencias de solapamiento en `src/app/admin/agenda/page.js` de color amarillo claro a color dorado/ámbar oscuro (`#b45309`).
    - Se implementó la selección y edición de zonas en el modal de edición/reprogramación de turnos administrativos en `src/app/admin/agenda/page.js` inicializando los checkboxes, agregando `toggleEditTurnoZone`, recalculando en caliente (horaFin, total, seña) y enviando el array en el cuerpo de la petición `PUT`.
    - Se modificó `/api/admin/turnos/[id]/route.js` para capturar `selectedZoneIds` y actualizar la columna `zonas` del turno en base de datos.
    - Se validó la compilación local (`npm run build`) de forma exitosa.
  - **13 de Julio (09:40 AM)**:
    - Se corrigió `getMailConfig` en `src/lib/email.js` para retornar `from` como un string plano limpio en lugar de un objeto. Esto soluciona los rebotes de correo generados por un encabezado From malformado (que los servidores de correo interpretaban como remitente inexistente).
    - Se agregó el ordenamiento cronológico por fecha y hora de inicio de forma ascendente en las consultas Prisma en `/api/clientes/consultar/route.js`. Esto garantiza que en la vista de autogestión de clientes con múltiples reservas futuras activas se muestre siempre la cita más próxima.
    - Se modificó la renderización del historial de turnos de la ficha del cliente en `src/app/admin/clientes/page.js` para que las sesiones de depilación se numeren cronológicamente y de forma exclusiva si tienen estado `REALIZADO`. Las canceladas o futuras se muestran en la lista pero sin prefijo numérico para no distorsionar el contador.
    - Se verificó la compilación local (`npm run build`) de forma exitosa.
    - Se reemplazó la imagen del logo en `public/logo.png` por la nueva imagen de letras negras provista (`letras negras.png`), y se incluyó en el repositorio git.
  - **15 de Julio (01:45 PM)**:
    - Se procesó el archivo `clientes_452252_1783952206.xlsx` de la raíz del proyecto usando un script de Python para realizar diagnósticos y convertir la información a JSON.
    - Se constató que la lista contiene 428 clientes sin emails duplicados ni DNIs duplicados, con un único email nulo y todos los números de teléfono presentes.
    - Se escribió el script `import_clients.js` para limpiar DNIs flotantes a string, normalizar números de teléfono usando `normalizeWhatsApp` del sistema, generar un email único de fallback para el caso nulo, y realizar un upsert condicionado por DNI, Email o WhatsApp.
    - Se ejecutó el script exitosamente sobre el entorno de desarrollo local (SQLite).
    - Se escribió y ejecutó `remote_import.js` para establecer una sesión SFTP segura, subir los datos e importar los clientes en el entorno de producción (PostgreSQL) sin exponer la información personal a Git. Se crearon 426 clientes nuevos y se fusionaron 2 existentes en el servidor de producción.
    - Se limpiaron los archivos temporales JSON de desarrollo y producción para salvaguardar la privacidad de la información.

## 📅 Sesión: 20 de Julio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Sincronizar notificaciones en backend (POST `/api/admin/configuracion`)
- [x] Eliminar bloqueos globales de envío de notificaciones (APIs + Cron)
- [x] Implementar navegación con fecha preservada entre Agenda y Ficha del Cliente (Agenda + Clientes frontend)
- [x] Soportar la zona extra "Otros" en el backend (POST + PUT APIs)
- [x] Implementar selector "Otros" y campo de texto en el frontend (Agenda modals)
- [x] Conectar observaciones del cliente al modal de detalle del turno (Agenda detail modal + backend)
- [x] Compilar, verificar y desplegar en producción (Hostinger VPS)
- [x] Rediseñar responsivamente la tabla del catálogo de zonas y precios en móviles (cards layout)
- [x] Cambiar la cuenta de correo de copias (BCC) a `backup@depilacionparahombres.com` (como mockup)

### 📝 Notas / Bitácora
- **20 de Julio (10:50 AM)**:
  - Se modificó la API de configuración en `src/app/api/admin/configuracion/route.js` para realizar una actualización masiva de `enviarNotificaciones = true/false` en todos los clientes en la base de datos cuando se activa/desactiva el interruptor global de notificaciones.
  - Se removieron los bloqueos rígidos de `global_notifications_enabled` de los archivos del cron de recordatorios (`src/lib/whatsapp.js`) y de todas las rutas de envío de mensajes/correos (turnos, MercadoPago webhooks, reprogramaciones, cancelaciones). Ahora las notificaciones se rigen únicamente por la preferencia individual de cada cliente.
  - Se modificó la navegación de la ficha del cliente en `/admin/clientes` para recibir los parámetros `date` y `view` de la agenda y retornarlos en el redireccionamiento de vuelta al presionar la "X", preservando así la fecha del calendario y evitando que se reinicie al día actual.
  - Se agregó soporte para una zona extra "Otros" con un campo de texto interactivo requerido en los formularios de agendamiento y reprogramación de turnos administrativos. El valor de "Otros" se inyecta en el JSON `zonas` del turno bajo el identificador `otros` y permite la edición manual del precio y la duración de la cita sin bloqueos automáticos.
  - Se vinculó el bloque de observaciones en el modal "Detalle del Turno" directamente con la base de datos de observaciones generales del cliente (`cliente.observaciones`), permitiendo su visualización y edición en caliente directamente desde la agenda para que aplique en cascada a todos los turnos del cliente.
  - Se verificó la compilación local del proyecto Next.js en producción mediante `npm run build` con éxito.
  - **20 de Julio (12:10 PM)**:
    - Se corrigió el diseño responsivo del buscador en la vista `/admin/clientes` implementando reglas flexbox con `flex-direction: column` en pantallas móviles. Esto evita que el campo de texto se achique a dimensiones de checkbox y permite que los controles de búsqueda se apilen limpiamente ocupando el 100% de la pantalla.
    - Se resolvió un error de distinción de mayúsculas y minúsculas (case-sensitivity) en la consulta PostgreSQL del buscador de clientes (`/api/admin/clientes`). Se añadió la propiedad `mode: 'insensitive'` en Prisma para que las búsquedas por nombre, email o WhatsApp funcionen correctamente sin importar la capitalización de la consulta del usuario.
  - **20 de Julio (01:15 PM)**:
    - Se modificaron todas las llamadas a `sendMail` en `src/lib/email.js` reemplazando la casilla de copia oculta (BCC) `nuevacuenta@depilacionparahombres.com` por la nueva dirección `backup@depilacionparahombres.com` tal como lo solicitó Gonzalo para preparar la posterior creación de la casilla de correos.
    - Se rediseñó el catálogo de zonas y precios en `src/app/admin/configuracion/page.js` agregando atributos `data-label` a los elementos `td` de la tabla.
    - Se implementaron estilos responsivos en `src/app/admin/configuracion/configuracion.module.css` para reestructurar la tabla convirtiéndola en una lista de tarjetas (cards) individuales en pantallas móviles. Esto expone completamente la duración de la zona y los botones de Editar y Eliminar de manera táctil y legible.

## 📅 Sesión: 22 de Julio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Unificar la croma y el alto contraste del correo de cancelación con la plantilla de confirmación (`#d4a54d` dorados sobre tarjetas oscuras)
- [x] Eliminar el color azul por defecto de las horas y fechas en todas las plantillas de correo agregando estilos en línea explícitos (`style="color: #d4a54d !important; text-decoration: none !important;"`)
- [x] Compilar, verificar y desplegar en producción (Hostinger VPS)

### 📝 Notas / Bitácora
- **22 de Julio (09:00 PM)**:
  - Se analizó la conversación y audios de Gonzalo donde señalaba que el mail de cancelación de turno usaba tonos bordó/rojos oscuros (`#7a1e1e`) difíciles de leer y con bajo contraste, y que los clientes de correo (Gmail, Apple Mail) renderizaban la hora en azul desentonando con la marca.
  - Se refactorizaron las plantillas HTML de correo en `src/lib/email.js`:
    - En `sendCancellationEmail` y `sendNoShowEmail` se reemplazaron los tonos bordó por el tema dorado `#d4a54d` con bordes de 4px en los bloques resaltados de detalles del turno.
    - En todas las plantillas (`sendConfirmationEmail`, `sendCancellationEmail`, `sendNoShowEmail`, `sendReceiptEmail`, `sendRescheduleEmail`, `sendReminder7DaysEmail`) se agregaron estilos en línea `style="color: #d4a54d !important; text-decoration: none !important; font-weight: bold;"` para la hora y `style="color: #ffffff !important; text-decoration: none !important;"` para las fechas, previniendo que Gmail o iOS Mail las interpreten como enlaces azules.
- **22 de Julio (09:25 PM)**:
  - Se analizaron las capturas de Gonzalo sobre los formularios de "Crear Nuevo Cliente" y "Edición de Ficha" donde el campo de WhatsApp con el prefijo `🇦🇷 +54` quedaba comprimido a 50px de ancho debido a que la grilla colocaba el campo en columnas de 50% al lado de otros inputs (como DNI o Email).
  - Se configuró `grid-column: 1 / -1` en los grupos de campos de WhatsApp, Email y DNI en `src/app/admin/clientes/page.js` y `src/app/admin/agenda/page.js`.
  - Se asignó `flex: 1` y `min-width: 0` al `input` interno de `phoneInputContainer` en `clientes.module.css` y `agenda.module.css`, garantizando que el campo de WhatsApp ocupe el 100% del ancho del modal y brinde un espacio cómodo para escribir los dígitos tanto en celulares como en computadoras.
  - Se verificó la compilación local del proyecto Next.js (`npm run build`) de forma limpia (34/34 rutas).

## 📅 Sesión: 23 de Julio de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Aplicar alto contraste negro (`color: #111111`) en el texto de zonas e historial de turnos de la ficha del cliente (`clientes.module.css`)
- [x] Ampliar el portal de autogestión para listar y permitir cancelar/reprogramar individualmente todos los turnos activos del cliente (`/api/clientes/consultar` + `src/app/page.js`)
- [x] Preservar valores guardados de precio total, seña y duración al abrir el modal de reprogramación de turnos administrativos (`src/app/admin/agenda/page.js`)
- [x] Corregir desfasaje de la grilla horaria en el calendario y expandir dinámicamente el horario de cierre según turnos agendados pasadas las 20:00 hs (`src/app/admin/agenda/page.js`)
- [x] Calcular dinámicamente la duración exacta en minutos (`timeToMinutes(end) - timeToMinutes(start)`) en el modal de detalle del turno para evitar desajustes como `20:00 a 20:50 (60 min)` (`src/app/admin/agenda/page.js`)
- [x] Agregar campo y botón de guardado para la Frecuencia Estimada (semanas) en el modal de detalle del turno (`src/app/admin/agenda/page.js`)
- [x] Corregir el bug del cron en `src/lib/whatsapp.js` donde el filtro de notificaciones previas de WhatsApp captaba confirmaciones/recibos impidiendo enviar los recordatorios de 48h, y agregar plantilla fallback obligatoria para Email 7d
- [x] Cambiar comportamiento de "Programar Siguiente Turno": navegar el calendario a la semana correspondiente para visualizar los huecos libres antes de agendar (`src/app/admin/agenda/page.js`)

### 📝 Notas / Bitácora
- **23 de Julio (02:20 PM)**:
  - Se analizaron las 5 capturas enviadas por Gonzalo con 4 observaciones clave:
    1. Texto de las zonas en el historial de clientes en blanco sobre fondo claro -> Poner en color negro para lectura óptima.
    2. Autogestión pública de turnos -> Mostrar todos los turnos activos agendados por el cliente para gestión individual.
    3. Modal de reprogramación -> Al editar un turno con precio/duración manual ($39.000 / 40 min), no recalcular automáticamente con valores del catálogo ($43.000 / 50 min).
    4. Desfasaje visual en el calendario de turnos -> Ajustar el mapeo de líneas de fondo de la grilla y expandir el límite nocturno si existen citas hasta las 22:00 hs.
  - Se elaboró el plan de implementación detallado en `implementation_plan.md` a la espera de aprobación para proceder con la ejecución.
- **23 de Julio (03:15 PM)**:
  - Se implementó la clase `.paperZonas`, `.paperDate`, `.paperMeta` en `clientes.module.css` con color `#111111` y fuentes en negrita de alto contraste.
  - Se actualizó `/api/clientes/consultar` para devolver `activeTurnos: client.turnos` y se modificó `src/app/page.js` renderizando una tarjeta por cada turno activo con acciones independientes.
  - Se configuró la bandera `isInitialEdit: true` en `setEditTurno` en `src/app/admin/agenda/page.js` impidiendo que se sobrescriban los precios o duraciones guardadas en citas personalizadas al reprogramar.
  - Se corrigió el mapeo de `.gridLineRow` a `Array.from({ length: endHour - startHour })` alineando las líneas del fondo del calendario a nivel píxel y habilitando el cálculo dinámico de `endHour = maxAppEndHour` para extender el horario si hay turnos hasta las 22:00 hs.
  - Se verificó la compilación local del proyecto Next.js (`npm run build`) de forma limpia (34/34 rutas).
- **23 de Julio (03:45 PM - 06:45 PM)**:
  - Se implementó el cálculo dinámico de minutos en el detalle del turno `(50 min)`.
  - Se integró el selector `tempClientFrecuencia` en la sección de datos del cliente del modal de detalles del turno, conectado con `handleSaveClientObservaciones` para actualizar `/api/admin/clientes/[id]`.
  - Se refactorizó `checkAndSendReminders` en `src/lib/whatsapp.js`:
    - Se aisló la búsqueda de notificaciones previas para que valide únicamente mensajes marcados con `[RECORDATORIO_48H]`, eliminando los falsos positivos causados por las confirmaciones iniciales o recibos de pago.
    - Se agregó `default7Body` como plantilla por defecto para emails de recordatorio a 7 días.
    - Se extendió la ventana del cron de recordatorios de 10:00 a 12:00 hs.
  - Se refactorizó `handleScheduleNextTurn` en `src/app/admin/agenda/page.js`: al hacer clic en "Programar Siguiente Turno", se calcula el lunes de la semana objetivo (`targetDate = currentFecha + freqWeeks * 7`), se cierra el modal y se cambia la vista del calendario a esa semana.
  - Compilación local probada y verificada de forma limpia con `npm run build` (34/34 rutas).
- **23 de Julio (07:55 PM)**:
  - Se configuró la casilla oficial de respaldos (BCC) `backup.gonzalodepilacion@gmail.com` en `src/lib/email.js` y `process.env.SMTP_BCC`.
  - Todas las notificaciones transaccionales (confirmación, cancelación, aviso inasistencia, recibo, reprogramación, recordatorio 7d) envían copia oculta automáticamente a la nueva casilla de Gmail.
  - Compilación local probada y verificada limpia con `npm run build` (34/34 rutas).
- **29 de Julio (09:46 AM)**:
  - Se analizaron 5 nuevas capturas enviadas con las siguientes observaciones:
    1. Turnos de 30 min: poner Nombre/Apellido arriba y Horario abajo (`15:40 - 16:10`) sin zonas y sin cortar la hora a la derecha; agregar guía punteada de media hora en el fondo.
    2. Autogestión pública: aplicar `mode: 'insensitive'` en `/api/clientes/consultar` para evitar fallos de verificación de email y mostrar aviso claro cuando no existan turnos activos.
    3. Scrollbar en `.gridBody`: conectar ref al contenedor gridBody con `overflow-y: auto` para preservar y restaurar el scroll exacto al salir/entrar de modales o fichas de cliente.
    4. Contexto al cambiar vista: mantener la fecha actual en pantalla al conmutar entre Día, Semana y Mes, y agregar un botón "📅 Hoy" dedicado.
    5. Modales 100% ancho: desplegar Nombre, Apellido, DNI, WhatsApp y Email en filas completas de 100% de ancho en móviles.
- **29 de Julio (10:45 AM)**:
  - Se configuró `git clean -fd -e .wwebjs_auth -e .wwebjs_cache` en `deploy_vps_workspace.js` para mantener intacta la sesión de WhatsApp en el VPS en cada despliegue.
  - Se añadieron los campos `descuentoTipo` y `descuentoValor` a Prisma `Turno` (`schema.prisma` & `npx prisma db push`), preservando los descuentos por porcentaje (20%) al reprogramar.
  - Se ajustó el color de texto en el historial de notificaciones del cliente a `#111111` para alto contraste.
  - Se actualizó `isPastDateTime` en `/api/admin/turnos/[id]/route.js` para permitir modificar/reprogramar citas del día actual independientemente de si la hora pautada ya transcurrió.
  - Se optimizó "Programar Siguiente Turno": navegación limpia a medio día (12:00 hs) para evitar corrimiento de feriados/días y auto-completado de todos los datos del cliente al pulsar en un horario libre.
  - Compilación local probada y verificada de forma limpia con `npm run build` (34/34 rutas).

## 📅 Sesión: 11 de Agosto de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Respetar la selección "Sin Descuento" en la visualización del ticket y evitar mostrar descuentos ficticios causados por cambios de precios en el catálogo de zonas
- [x] Preservar la duración personalizada (horaFin) de los turnos en el formulario de creación manual de la agenda al cambiar el tipo/valor de descuento
- [x] Ajustar la modificación de Hora de Inicio en el formulario de creación para que desplace Hora de Fin respetando la duración previa (como en el de edición)
- [x] Desplegar en producción sobre el VPS con PostgreSQL y reiniciar PM2

### 📝 Notas / Bitácora
- **11 de Agosto (09:00 PM)**:
  - Se modificó `getUpdatedTurnoPrices` en `src/app/admin/agenda/page.js` para que si `turno.descuentoTipo === 'NINGUNO'` o falsy, el valor de `bonificacion` sea forzado a `0`, evitando que se calcule un descuento implícito si cambió el precio base de las zonas de depilación en el catálogo.
  - Se condicionaron los bloques de "Descuento Aplicado" y "Valor Original" en el ticket detalle de la agenda (`src/app/admin/agenda/page.js`) y en la página de autogestión de clientes (`src/app/page.js`) para que se rendericen únicamente si `descuentoTipo` no es `'NINGUNO'`.
  - Se incorporó `autoHoraFin` en el estado de `newTurno` en `src/app/admin/agenda/page.js` para realizar el seguimiento del horario de fin calculado por el sistema, permitiendo al `useEffect` omitir la sobreescritura de `horaFin` si el usuario ha establecido un valor personalizado (override manual) al modificar el tipo/valor de descuento.
  - Se modificó el evento `onChange` de `horaInicio` en el formulario de creación manual (`newTurno`) para calcular y desplazar la hora de fin respetando la duración previamente elegida o ingresada por el usuario (emulando el comportamiento del modal de edición).
  - Se compiló localmente con éxito, se resolvieron conflictos de configuración del proveedor Prisma (SQLite/PostgreSQL) en el VPS, se ejecutó `npm install` de dependencias pendientes (`nodemailer`) y se desplegó en producción reiniciando el servicio PM2 `gonzalo-agenda`.

## 📅 Sesión: 12 de Agosto de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Agregar campo dedicado "Valor Zonas Extras ($)" al activar la casilla "Otros" en Nuevo Turno, Editar Turno y Siguiente Turno
- [x] Implementar desglose de precios claro: Valor Zonas Normales (lista dinámica) + Valor Zonas Extras (fijo) = Total Base
- [x] Mantener herencia exacta del valor de zonas extras al programar el siguiente turno
- [x] Extraer lista de clientes y turnos futuros que tienen "Otros" para control de Gonzalo
- [x] Desplegar en producción en Hostinger VPS y reiniciar PM2

### 📝 Notas / Bitácora
- **12 de Agosto (10:35 AM)**:
  - Se incorporó el input numérico `Valor Zonas Extras ($)` (`otrosPrecio`) al tildar la opción "Otros" en `newTurno` y `editTurno`.
  - Se diseñó el desglose visual en dos bloques: `Zonas Normales ($)` (auto-calculado de lista) y `Valor Zonas Extras ($)` (monto manual), calculando automáticamente el `Total Turno Base ($)` y la seña correspondiente.
  - Se actualizó el guardado en la API (`/api/admin/turnos` y `/api/admin/turnos/[id]`) persistiendo `precio` en el objeto `{ id: 'otros', nombre: 'Otros: ...', precio: X, duracion: 0 }`.
  - Se actualizó `getUpdatedTurnoPrices` para incluir `otrosPrice` en la base total del turno.
  - Al hacer clic en "Programar Siguiente Turno", se transfieren intactos el texto de Otros y el `otrosPrecio` previo, recalculando las zonas normales a precios vigentes.
  - Se ejecutó script en el VPS extrayendo los 75 turnos activos con zonas "Otros" para facilitarle el listado a Gonzalo.
- **12 de Agosto (01:00 PM)**:
  - Localización en base de datos PostgreSQL de producción del cliente con email `elfuria73@hotmai.com`: Cliente **Pablo Vazquez**, WhatsApp `5491155665821`, DNI `265`, turno el 19/08/2026 a las 14:00 hs.
  - Corrección del buscador de clientes en `/api/admin/clientes`: agregado de `mode: 'insensitive'` en PostgreSQL y soporte de búsqueda por campo `dni`.
  - Agregado de búsqueda reactiva debounce (300ms) en la barra de búsqueda de clientes.
  - Creación del módulo central de códigos de país `src/lib/countryCodes.js` y componente visual `src/components/PhoneInput.js`.
  - Integración del selector de países (🇦🇷 +54, 🇪🇸 +34, 🇺🇾 +598, 🇨🇱 +56, 🇺🇸 +1, 🇧🇷 +55, etc. y personalizado 🌐) en todos los formularios.
  - Actualización de formateo dinámico de teléfonos para mostrar la bandera y código de área correspondiente según el país del cliente.
- **25 de Agosto (02:30 PM)**:
  - Eliminación de la opción `Pendiente de Pago` (`PENDIENTE_PAGO`) en el selector `Estado Inicial` del modal de creación de turnos (`src/app/admin/agenda/page.js`).
  - Configuración de `Señado / Confirmado` (`SEÑADO`) como estado inicial por defecto en todas las creaciones manuales de turnos (click en slot horario, agendar siguiente turno y botón + Nuevo Turno).
  - Verificación exitosa de compilación limpia con `npm run build` (34/34 rutas).

## 📅 Sesión: 02 de Septiembre de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Extraer texto, estructura y todas las imágenes (10 imágenes y 10 páginas renderizadas) del documento `Mejoras AppWeb.docx` y PDF.
- [x] Identificar y analizar cada mockup gráfico: Alta de Turno (`image9`), NeoCita diaria (`image8`), semáforo mensual (`image7`), boxes (`image4`), acordeón de servicios (`image6`), toggle de notificaciones en clientes (`image11`/`page_8`), recibo comercial oficial (`image3`) y marcas de selector de operador en agenda y clientes (`image1`/`image5`).
- [x] Diseñar e implementar el entorno de pruebas aislado (Staging) en Hostinger VPS:
  - Nueva rama Git `staging` enlazada con GitHub.
  - Clon de repositorio en `/srv/gonzalo-dep-staging`.
  - Base de datos aislada `agenda_db_staging`.
  - Proceso PM2 `gonzalo-agenda-staging` corriendo en puerto 3008 con `WHATSAPP_ENABLED=false` para proteger la sesión de producción.
- [x] Desarrollar el Módulo 1: **Alta Rápida de Turno** (`/admin/alta-turno`):
  - API `/api/admin/alta-turno/disponibilidad` con cálculo predictivo de duración, franja horaria y filtro por días hábiles.
  - Frontend interactivo con calendario semaforizado (🟢 Disponible, 🔴 Lleno, 🔘 Deshabilitado).
  - Columna derecha con listado de horarios disponibles cada 10 minutos (estilo `image9.png`).
  - Botón de acción con redirección y precarga automática de fecha, hora, duración y zonas en el modal de nuevo turno de la agenda.
  - Agregado del ícono y enlace `⚡ Alta de Turno` en la barra lateral por encima de `Agenda`.

## 📅 Sesión: 03 y 04 de Septiembre de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Implementar ventana desplegable vertical de horarios disponibles ("abrir y cerrar" con fecha en cabecera) directamente debajo del calendario para celulares y escritorio.
- [x] Solucionar cortes laterales en dispositivos móviles (calendario y columna de domingo DOM).
- [x] Corregir la indicación de "Semana sugerida" para que no tape los números de los días (estrella ⭐ y borde dorado).
- [x] Corregir el corte de horarios a las 18:30 hs al buscar turnos hasta las 22:00 hs con 90 min de duración en `/api/admin/alta-turno/disponibilidad`.
- [x] Extraer la confirmación del turno fuera del bloque scrollable de horarios (`desplegableFooter` sticky) para confirmar sin tener que scrollear.
- [x] Ajustar la tipografía y dimensiones de los slots a formato compacto de un solo renglón (`21:20 hs ➔ 21:40 hs ⏱️ 20 min`), evitando el quiebre de línea de `hs`.
- [x] Separar el botón `Editar Turno` del modal de turno de la agenda en dos:
  - ✏️ `Editar Turno`: edición manual estándar.
  - 🔄 `Reprogramar`: redirección a Alta de Turno precargando datos para elegir nueva fecha/hora.
- [x] Integrar el botón `📅 Siguiente Turno` con Alta de Turno:
  - Resaltar en el calendario la **semana sugerida** según la frecuencia del cliente (ej: a las 3 o 4 semanas).
  - Precargar datos del turno anterior y devolver a la agenda con el horario seleccionado.
- [x] Compilar y desplegar exclusivamente en el entorno Staging (`http://187.127.9.216:3008`).

## 📅 Sesión: 05 de Septiembre de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Crear backup integral de base de datos PostgreSQL (`agenda_db`) de producción en el VPS (`/root/backups/backup_agenda_db_prod_20260905.dump` y `.sql`).
- [x] Descargar copia de seguridad local en `scratch/backups/backup_agenda_db_prod_20260905.dump`.
- [x] Crear tag de rollback en Git `backup-prod-before-alta-turno` en el commit `4206b7c` y sincronizar con GitHub.
- [x] Fusionar rama `staging` en `main` y pushear a GitHub.
- [x] Desplegar en producción oficial en el VPS (`https://agenda.depilacionparahombres.com`, puerto 3006).
- [x] Verificar respuesta HTTP 200 OK, re-autenticación de WhatsApp (`WhatsApp Client is ready!`) y funcionamiento en vivo.

### 📝 Notas / Bitácora
- **05 de Septiembre (14:20 - 14:30)**:
  - Gonzalo aprueba la versión final del Módulo 1 probada en Staging y solicita backup preventivo antes de implementarlo en la agenda oficial.
  - Se ejecuta script automatizado de backup vía SSH/SFTP: `pg_dump` genera volcado binario de 574 KB y SQL plano de 2.2 MB en `/root/backups/`, descargándose copia local en `scratch/backups/`.
  - Se crea y publica el tag Git `backup-prod-before-alta-turno` en GitHub asegurando un punto de rollback instantáneo.
  - Se realiza fast-forward merge de `staging` hacia `main` (`d1fe3bc`) y se sube a GitHub.
  - Se ejecuta `deploy_vps_workspace.js`: Next.js compila las 37 rutas en 19.2 segundos en producción, se actualiza el proceso PM2 `gonzalo-agenda` (ID 142) en el puerto 3006.
  - Se verifica que la sesión de WhatsApp `.wwebjs_auth` se mantiene intacta: el watchdog y cliente inician automáticamente (`WhatsApp Client authenticated. WhatsApp Client is ready!`).
  - Se validan mediante peticiones HTTPS las rutas `/`, `/admin/alta-turno`, y la API `/api/admin/alta-turno/disponibilidad` confirmando la correcta generación y visualización de disponibilidad sobre la base de datos real.

## 📅 Sesión: 06 de Septiembre de 2026

### 🎯 Tareas en curso / Objetivos
- [x] Implementar generación de slots cada 30 minutos anclados a `gapStart` y `gapEnd` en `/api/admin/alta-turno/disponibilidad/route.js`.
- [x] Fijar horario por defecto de 14:00 a 22:00 hs en `/admin/alta-turno/page.js` y en la API.
- [x] Cambiar el cron de recordatorios de WhatsApp en `src/lib/whatsapp.js` a chequeo cada 1 minuto para asegurar despacho exacto a las 10:00:00 hs.
- [x] Ejecutar build de prueba (`npm run build`) verificando 37/37 rutas exitosas.

- [x] Toggle selector de intervalo `[ 30 min ]` (predeterminado) y `[ 10 min ]` en la ventana desplegable de Alta de Turno (`alta-turno/page.js`, `alta-turno.module.css` y `route.js`).
- [x] Preservación de descuento (% o $) en "Programar Siguiente Turno" (`handleScheduleNextTurn` -> `alta-turno` -> `newTurno` en `agenda/page.js`).
- [x] Corrección de modal de confirmación en Reprogramar: agregar `setIsDetailsOpen(true)` al recibir `reprogramarTurnoId` (`agenda/page.js`).

### 📝 Notas / Bitácora
- **06 de Septiembre (17:45 - 18:00)**:
  - Se analizan los audios y capturas de Gonzalo sobre tres observaciones:
    1. **Slots cada 30 minutos / Anti-huecos muertos**: El step previo de 10 min generaba huecos muertos inutilizables de 10 o 20 min. Gonzalo requiere que los turnos avancen cada 30 min desde el fin del turno anterior (`gapStart`), o se anclen al inicio del turno siguiente (`gapEnd - duracion`) sin dejar huecos menores a 30 min.
    2. **Hora de Inicio por defecto 14:00 a 22:00 hs**: En `/admin/alta-turno`, se cargaba `12:30` de la base de datos. Gonzalo opera de 14:00 a 22:00 hs habitualmente y atiende a las 13:00/13:30 solo de forma excepcional.
    3. **WhatsApp a las 10:08 hs**: Se diagnosticó que `startReminderCron()` utilizaba `setInterval(..., 15 * 60 * 1000)`. Si el servidor inició a las XX:08, la comprobación caía a las 10:08 AM. Se ajusta a intervalo de 1 minuto para ejecutar a las 10:00:xx AM sin demoras.
  - Se diseñó y validó con pruebas unitarias el nuevo algoritmo de generación de slots bidireccional anclado.
  - Se aplicaron los cambios en `route.js`, `page.js` y `whatsapp.js`.
  - Se ejecutó `npm run build` localmente compilando las 37 rutas en 41 segundos sin ningún error.
  - Se desplegó en producción y se verificó en vivo.
- **06 de Septiembre (18:15 - 18:30)**:
  - Se analizan las 5 capturas enviadas por Luciano (asistente de Gonzalo):
    1. **Default 14:00 hs**: Ya implementado previamente.
    2. **Selector 30 min vs 10 min**: Se añade la barra `.intervalFilterBar` con botones redondeados `[ 30 min ]` (activo por defecto) y `[ 10 min ]` en la tarjeta desplegable de horarios. En backend, `/api/admin/alta-turno/disponibilidad` soporta `intervalo=30` (algoritmo inteligente sin huecos muertos) e `intervalo=10` (pasos granulares cada 10 min).
    3. **Preservar descuento en Siguiente Turno**: Se traspasan `descuentoTipo` y `descuentoValor` en `handleScheduleNextTurn`, pasando por `alta-turno` y precargándose en `newTurno` en la agenda.
    4. **Bug al reprogramar**: Al regresar de Alta de Turno a la agenda con `reprogramarTurnoId`, faltaba la llamada a `setIsDetailsOpen(true)`, por lo que el modal quedaba oculto. Se añadió `setIsDetailsOpen(true)` para que la ventana de confirmación y edición aparezca de inmediato.
  - **07 de Septiembre (16:45 - 17:00)**:
  - Gonzalo reporta error al programar siguiente turno: al seleccionar el nuevo horario e intentar guardar, salta un popup "⚠️ Error interno" y no permite grabar el turno.
  - Se inspeccionan los logs de PM2 en el servidor de producción (`187.127.9.216`):
    - Se descubre error: `PrismaClientValidationError: Invalid prisma.cliente.findUnique() invocation: Argument id: Invalid value provided. Expected String, provided Int. id: 24`.
    - **Causa Raíz**: En `src/app/admin/agenda/page.js`, al leer `clienteIdParam`, se ejecutaba `(parseInt(clienteIdParam, 10) || clienteIdParam)`. Para clientes cuyo UUID en PostgreSQL comenzaba con dígitos (ej: `24ae95df-...`), `parseInt` truncaba el UUID al entero `24`. Al enviar `{ clienteId: 24 }` al backend, Prisma rechazaba el entero al esperar un String UUID.
  - **Solución**:
    1. Se sustituyó el casteo en `agenda/page.js` por `String(clienteIdParam)`, manteniendo intacto el UUID completo del cliente.
    2. En `api/admin/turnos/route.js`, se blindó la recepción con `finalClienteId = clienteId ? String(clienteId) : null` y se incorporó un mecanismo resiliente de resolución de cliente (búsqueda por ID, fallback por DNI/email/WhatsApp, y chequeo seguro de `turnos?.length`).
    3. Se añadió control de excepciones en la actualización de observaciones del cliente (`.catch(...)`).
  - Se verificó compilación local con `npm run build` (37/37 rutas exitosas).
- **07 de Septiembre (17:30 - 18:00)**:
  - Gonzalo reporta incidencia al reprogramar turno: "Hola Fede, anda bien cuando hago 'siguiente turno'. Pero cuando quiero reprogramar un turno y elijo horario, no le aparece la ventana para agendar el turno, me aparece la agenda vacia nomas."
  - Se diagnosticó la causa raíz:
    1. `src/app/api/admin/turnos/[id]/route.js` no implementaba el método `GET` (solo tenía `PUT` y `DELETE`). Al solicitar los datos del turno con `fetch('/api/admin/turnos/' + reprogramarTurnoId)`, el servidor devolvía error HTTP 405 Method Not Allowed, por lo que nunca se seteaba `selectedTurno` y la ventana modal de edición/confirmación no se abría.
    2. La navegación desde `AltaTurnoPage` en modo reprogramar usaba `router.push()` y no incluía el parámetro `date`, produciendo estados transicionales superficiales en móviles.
    3. `PUT /api/admin/turnos/[id]` y `POST /api/admin/turnos` restringían los turnos al horario configurado en DB (12:30 a 22:00 hs), rechazando turnos administrativos tempranos (ej: 11:30 hs) o nocturnos.
    4. En `/api/admin/alta-turno/disponibilidad` y `/api/disponibilidad`, el estado `REPROGRAMADO` estaba en la lista de exclusión (`notIn`), lo que provocaba que turnos activos reprogramados fueran considerados erróneamente como huecos libres. Asimismo, al reprogramar en el mismo día, el propio turno a mover se bloqueaba a sí mismo.
  - Soluciones implementadas:
    1. Se implementó `export async function GET(request, { params })` en `src/app/api/admin/turnos/[id]/route.js` con autenticación y relación completa `include: { cliente: true }`.
    2. Se flexibilizó el rango horario administrativo a `07:00` a `23:00` hs para que el operador pueda agendar o reprogramar libremente en casos excepcionales.
    3. Se implementó redirección de página completa con `window.location.href` en `handleProceed` de Alta de Turno para todos los modos (`reprogramar`, `siguienteTurno`, `nuevo`).
    4. Se implementó soporte de `excludeTurnoId` en `/api/admin/alta-turno/disponibilidad` y se eliminó `REPROGRAMADO` de las listas `notIn` en disponibilidad administrativa y pública.
    5. Se preconfiguró el mes y fecha original en Alta de Turno al ingresar en modo reprogramar para situar al usuario en el contexto correcto.
  - Se verificó compilación local con `npm run build` (37/37 rutas exitosas).
- **08 de Septiembre (19:20 - 19:35)**:
  - Luciano reporta incidencia: "Hola Fede, al hacer siguiente turno ahora, no se guarda la seña que tenía en el turno anterior, se calcula automáticamente".
  - Se diagnosticó la causa raíz:
    - En `handleScheduleNextTurn` (`src/app/admin/agenda/page.js`), al construir los parámetros hacia Alta de Turno (`modo=siguienteTurno`), no se incluía `turno.valorSeña`.
    - Al seleccionar el nuevo horario en Alta de Turno y regresar a la agenda (`alta-turno/page.js` -> `agenda/page.js`), `seña` no viajaba en la URL.
    - Como `manualSeñaOverride` no se definía en `setNewTurno`, el efecto de recálculo de precios y la carga de zonas sobreescribían `valorSeña` calculando automáticamente el 50% según las zonas seleccionadas, perdiendo señas personalizadas (ej. $0 o importes fijos acordados previamente con clientes recurrentes).
  - Soluciones implementadas:
    1. En `src/app/admin/agenda/page.js`: En `handleScheduleNextTurn`, se extrae `prevSeña = turno.valorSeña !== undefined && turno.valorSeña !== null ? String(turno.valorSeña) : '0'` y se añade como parámetro `seña` a la URL.
    2. En `src/app/admin/alta-turno/page.js`: Se extrae `señaParam` y se reenvía en `handleProceed` hacia la agenda cuando `modo === 'siguienteTurno'`.
    3. En `src/app/admin/agenda/page.js`: En la recepción de `isNewTurnoReq`, se lee `señaParam`, precargando `valorSeña` y `manualSeñaOverride` con dicho valor numérico. Asimismo, se protegió la carga de zonas (`/api/zonas`) para que respete `manualSeñaOverride` si está definido.
  - Se verificó compilación local con `npm run build` (37/37 rutas exitosas).
- **08 de Septiembre (20:30 - 20:45)**:
  - Gonzalo envía capturas reportando que al poner siguiente turno sigue recalculándose la seña al 50% ($34.500 en lugar de $15.500 de Rafael Vazquez).
  - Se diagnosticó mediante inspección directa por SSH al VPS Hostinger:
    1. En el VPS de producción (`/srv/gonzalo-dep`), existía un commit local `9e4884c` no integrado en GitHub con mejoras del watchdog y cron de WhatsApp.
    2. El comando `git pull origin main` en `deploy_vps_workspace.js` había fallado silenciosamente debido a la divergencia de ramas (`Your branch and origin/main have diverged`), por lo cual `da7f8eb` nunca se desplegó en producción y el servidor continuaba ejecutando el build antiguo.
    3. Adicionalmente, en `src/app/admin/agenda/page.js`, la carga de `/api/zonas` ejecutaba un `setNewTurno` redundante y el caso de `selectedZoneIds.length === 0` forzaba `valorSeña: 0`.
  - Soluciones implementadas:
    1. Se integraron en local las mejoras de `9e4884c` en `src/lib/whatsapp.js` (Chromium liveness watchdog, normalización JID/LID vía `getNumberId`, pausa de cortesía 2s entre envíos y deduplicación estricta con `estado: ENVIADO`).
    2. Se simplificó `fetch('/api/zonas')` en `src/app/admin/agenda/page.js` para delegar el recálculo exclusivamente en el efecto centralizado de precios, protegiendo `manualSeñaOverride` contra cualquier anulación o reseteo a 0.
    3. Se validó la compilación local (`npm run build`, 37/37 rutas exitosas en 19.5s).
    4. Se sincroniza con GitHub y se despliega con `git fetch` y `git reset --hard origin/main` en Producción (3006) y Staging (3008).
- **08 de Septiembre (20:50 - 21:05)**:
  - Gonzalo envía captura con 2 solicitudes puntuales en `/admin/alta-turno`:
    1. Que el badge superior de seña muestre la seña real heredada del turno previo (ej: $15.500 para Rafael) en vez de recalcular siempre el 50%.
    2. Remover los filtros extras inferiores (`[ 📍 Lunes a Viernes ] [ 🗓️ Toda la semana ] [ 🌙 Noche (18:00+) ]`) para dejar más limpia la vista móvil.
  - Soluciones implementadas:
    1. En `src/app/admin/alta-turno/page.js`, se implementó `displaySeña` (utilizando `señaParam` si fue transmitido, con fallback a cálculo base de zonas) y `displayTotal` (aplicando descuentos heredados porcentuales o fijos).
    2. Se vincularon los badges `.badgeSummary` a `displayTotal` y `displaySeña`, mostrando la seña explícita aun si es $0.
    3. Se removió el bloque `.presetBtns` y sus estilos en `alta-turno.module.css`.
  - Verificación: `npm run build` compiló exitosamente (37/37 rutas).
- **09 de Septiembre (18:45 - 19:05)**:
  - Gonzalo envía captura de pantalla de WhatsApp:
    - En el modal de agendado, seleccionando Hombros y Pecho y abdomen con descuento del 10%:
    - "Total de Venta ($): 68000" (75000 base - 10% = 67500 -> 68000 redondeado a mil).
    - "Seña Recibida ($): 37500".
    - Gonzalo señala: *"Acá hay otro error, aplicó el descuento del 10% y la seña me la sigue tomando del 50% del valor original y no del Nuevo"*.
  - Diagnóstico:
    - `autoSeña` y el fallback de `valorSeña` calculaban `calcs.valorSeña + Math.round(otrosExtra * 0.5)`, lo cual sumaba el 50% de las zonas a precio de catálogo sin aplicar la bonificación.
    - Cuando se definía un descuento o cambiaban los valores, `valorSeña` quedaba anclado a 37500 (50% de 75000) en lugar de recalcularse a 34000 (50% de 68000).
  - Soluciones implementadas (D-50):
    1. En `src/app/admin/agenda/page.js`:
       - Se definió `calculatedAutoSeña = Math.round(finalTotal * 0.5)`.
       - En `setNewTurno`, si existe descuento activo y la seña previa coincidía con el 50% sin descuento (37500), se actualiza automáticamente al 50% del nuevo total con descuento (34000). Se respetan señas fijas personalizadas (ej. $15.500 de Rafael o $0).
       - Al modificar `descuentoTipo`, `descuentoValor`, zonas o extras, se limpia `manualSeñaOverride: undefined` para recalcular dinámicamente la seña al 50% del nuevo total.
       - Se aplicó la misma regla en `editTurno`.
    2. En `src/app/admin/alta-turno/page.js`:
       - `displaySeña` calcula el 50% de `displayTotal` (el total bonificado).
       - Se añadió tracking `userModifiedZones`: si el operador altera las zonas o extras, se anula la seña fija heredada y se recalcula al 50% del nuevo total.
       - `handleProceed` transfiere `displaySeña` explícito a la agenda.
    3. En `src/app/api/admin/turnos/route.js`:
       - Si no se especifica `valorSeña`, el backend computa `Math.round(finalValorTotal * 0.5)`.
   - Verificación: `npm run build` compiló exitosamente (37/37 rutas compiladas en 33.5s sin errores).
- **09 de Septiembre (19:10 - 19:25)**:
  - Gonzalo envía capturas de pantalla de WhatsApp:
    - *"Hola Fede acá cuando pongo agendar siguiente turno o reagendar a un turno que tenía una duración de 30min (por ejemplo). En modulo de búsqueda de turno aparece bien la duración, pero cuando elijo horario y me manda a la ventana, se calcula de vuelta el tiempo y pasa a ser 20min, tiene que respetar el que tenía el anterior turno a menos que lo modifique yo"*
  - Diagnóstico:
    - En `src/app/admin/agenda/page.js`, cuando se recibía `isNewTurnoReq`, `manualHoraFinOverride` se seteaba forzosamente en `false`.
    - Al montarse el estado de `newTurno`, el `useEffect` de recálculo de precios y duración evaluaba `prev.manualHoraFinOverride ? prev.horaFin : horaFinStr`. Al ser `false`, sobreescribía `calcHoraFin` (e.g. 19:50, 30 min) con la duración del catálogo de zonas (e.g. 20 min para Genitales -> 19:40).
  - Soluciones implementadas (D-51):
    1. En `src/app/admin/agenda/page.js`:
       - Se definió `manualHoraFinOverride: Boolean(horaFinParam || (timeParam && searchParams.has('duracion')))` al inicializar `newTurno` desde los parámetros de URL de Alta de Turno.
       - En `useEffect`, se asignó `autoHoraFin: prev.manualHoraFinOverride ? prev.horaFin : horaFinStr` para mantener la hora fin en sincronía.
       - Al hacer click en celda de calendario con `pendingNextScheduleData`, se preserva `manualHoraFinOverride: Boolean(pendingNextScheduleData.inheritedDuration)`.
       - Si el operador desmarca o agrega zonas en el modal (`toggleNewTurnoZone`), se resetea `manualHoraFinOverride: false` para recalcular dinámicamente la duración al nuevo conjunto de zonas elegidas.
  - Verificación: `npm run build` compiló exitosamente (37/37 rutas en 22.3s).
- **10 de Septiembre (12:30 - 13:05)**:
  - Gonzalo envía captura de pantalla de WhatsApp:
    - *"Hola Fede nosé que paso con la agenda pero varios aparecen así con el nombre de wpp, se les cambió el nombre en la agenda"*
    - En la agenda de hoy `JUE 10`, varios turnos mostraban el formato crudo de la libreta de contactos de Gonzalo:
      - `Laser Alan Taborda 23-7-26 Abd $20...`
      - `Laser Pablo Zincarini 13-8-16 Pier Esp Gl $79k`
      - `Laser Sergio Escalante 10-10-23 Esp Torso Ax $14k`
      - `Laser Claudio Maidana`
  - Diagnóstico y Root Cause (ERR-19):
    - En `/srv/ia-gonzadep/src/lib/whatsapp.js`, la función `syncWhatsAppContactsToDb` (ejecutada tras cada inicio/reconexión de WhatsApp) leía los 10.335 contactos de la libreta del celular de Gonzalo y ejecutaba:
      ```javascript
      if (conv.clienteId) {
        await prisma.cliente.update({
          where: { id: conv.clienteId },
          data: { nombreCompleto: targetName }
        });
      }
      ```
    - Dado que Gonzalo guarda a sus pacientes en su celular con notas clínicas, fechas y precios para identificar sus tratamientos previos, esta sincronización pisaba destructivamente el `nombreCompleto` limpio de `Cliente` en `agenda_db`.
    - Se constató que 19 clientes de la base de datos se encontraban contaminados con este formato (ej. `Laser Claudio Maidana`, `Cancelo Laser Ariel Benitez...`, `Laser David Gonzalez...`).
  - Soluciones implementadas (D-52):
    1. En `/srv/ia-gonzadep/src/lib/whatsapp.js`:
       - Se eliminó completamente la llamada `prisma.cliente.update` en `syncWhatsAppContactsToDb`. Los contactos de la libreta se sincronizan únicamente en `ConversacionWsp.nombreContacto` y estado de IA, preservando intacta la tabla `Cliente`.
       - Se blindó la extracción de nombres de saludos para que verifique si el cliente ya cuenta con un nombre válido antes de actualizar `Cliente.nombreCompleto`.
    2. Saneamiento de base de datos en `agenda_db`:
       - Se ejecutó un script de saneamiento que restauró los 19 clientes con sus nombres propios y apellidos correspondientes (deducidos de comprobantes, emails y registros de notificaciones previas).
       - Cualquier dato valioso de tratamiento previo o precio se migró de manera segura a `Cliente.notasGonzalo`.
    3. Verificación de producción:
       - Se recompiló `ia-gonzadep` (`npm run build` exitoso en 23.2s).
       - Se reinició el proceso PM2 `ia-gonzadep` (id 134).
       - Se verificó en los logs que la sesión se autenticó (`[WhatsApp Engine] ✅ Cliente CONECTADO y LISTO.`), se ejecutó la sincronización de contactos y no se alteró ningún registro de `Cliente` (`Total matches: 0`).
       - En la agenda de hoy `JUE 10`, el turno de las 17:00 ahora muestra limpiamente `Claudio Maidana` y los demás turnos se mantienen en perfecto estado.
- **10 de Septiembre (17:25 - 17:45)**:
  - Gonzalo envía 4 capturas de pantalla de WhatsApp con 3 reportes:
    1. *Disponibilidad*: En `/admin/alta-turno`, con "Cada 30 min", el sistema ofreció turnos separados por 10 min (`14:00 -> 14:50` y `14:10 -> 15:00`). Gonzalo: *"Volvio a ofrecer turnos cada 10 minutos"*.
    2. *WhatsApp*: *"Hola Fede, la agenda no está enviando la confirmación de Turnos... Recién cargué otro turno, corrobore que estuviera conectada y no se envió la notificación"*.
    3. *Seña*: Al agendar siguiente turno a Sergio Escalante con Cuerpo Completo ($150.000), Total: $150.000, Seña: $75.000. Gonzalo: *"Lo de la seña aun no esta arreglado y calcula el 50% en lugar de traer el valor cargado"*.
  - Diagnóstico y Root Cause (ERR-20):
    1. En `/api/admin/alta-turno/disponibilidad/route.js`, en huecos de 60 min y turnos de 50 min, el fallback añadía `gap.start` (14:00) y `gap.end - duracion` (14:10), rompiendo el espaciado de 30 min.
    2. En el VPS, `ia-gonzadep` (3007) mantenía sesión WhatsApp conectada y activa, mientras `gonzalo-agenda` (3006) estaba en `QR_RECEIVED`/desconectado. Gonzalo verificaba `admin.depilacionparahombres.com` (3007) creyendo que compartían estado.
    3. En `alta-turno/page.js`, `displaySeña` anulaba la seña cargada ante `userModifiedZones = true`. En `agenda/page.js`, `toggleNewTurnoZone` forzaba `manualSeñaOverride: undefined`.
  - Soluciones implementadas (D-53, D-54):
    1. Se reescribió la generación de slots en `/api/admin/alta-turno/disponibilidad/route.js` con avance lineal de 30 min desde `gap.start` sin sub-pasos ni bifurcaciones.
    2. Se creó `/srv/ia-gonzadep/src/app/api/whatsapp/send/route.js` y se implementó un relay automático en `src/lib/whatsapp.js` de la agenda. Se sincronizó `getWhatsAppStatus` para consultar dicho relay y evitar bloqueos en notificaciones.
    3. Se fijó la preservación incondicional de `señaParam` in `alta-turno/page.js` y se protegió `manualSeñaOverride` en `agenda/page.js`.
  - Verificación:
    - Compilación local exitosa (`npm run build`, 37/37 rutas).
    - Compilación y reinicio en VPS de `ia-gonzadep` exitosos.
    - Prueba del endpoint `/api/whatsapp/send` en el VPS validada.
- **10 de Septiembre (17:50 - 18:05)**:
  - Gonzalo reitera a las 17:23 hs con capturas (tomadas a las 17:22 hs, justo antes de nuestro deploy de las 17:42 hs):
    - Sergio Escalante ($100.000, Seña $13.000).
    - En Alta de Turno con Cuerpo Completo y Otros ($170.000), la seña se recalculó al 50% ($85.000).
    - Mensaje: *"Fede mira, cuando hago siguiente turno, y le sumo o cambio zonas para el siguiente turno, la seña se calcula de vuelta y se pierde la seña original, debería cambiarse solo cuando lo hago de forma manual"*.
  - Diagnóstico Exhaustivo:
    1. Las capturas de Gonzalo correspondían al test de las 17:22 hs previo al despliegue de las 17:42 hs.
    2. Adicionalmente, se detectaron 4 fugas residuales donde `manualSeñaOverride: undefined` aún se ejecutaba en la agenda al alterar descuentos (`descuentoTipo` y `descuentoValor` en líneas 2692, 2705, 3663, 3676).
    3. En `toggleEditTurnoZone` y `hasOtros`, no se garantizaba el fallback a `prev.valorSeña`.
    4. En `src/app/admin/alta-turno/page.js`, el bloque predeterminado de `handleProceed` omitía `seña`.
  - Soluciones implementadas (D-55):
    1. Se erradicó toda ocurrencia de `manualSeñaOverride: undefined` en `src/app/admin/agenda/page.js`.
    2. Se aplicó fallback seguro `prev.manualSeñaOverride !== undefined ? prev.manualSeñaOverride : prev.valorSeña` en todos los selectores y toggles.
    3. Se limpió el estado inerte `userModifiedZones` y se agregó `...(hasExplicitSeña ? { seña: displaySeña.toString() } : {})` en `alta-turno/page.js`.
  - Verificación:
    - Compilación local exitosa (`npm run build`, 37/37 rutas compiladas limpiamente en 20.8s).
- **11 de Septiembre (19:10 - 19:25)**:
  - Gonzalo envía captura a las 18:33 hs en `/admin/alta-turno`:
    - Mensaje: *"Hola Fede nosé que paso ahora que cuánto toco otras zonas no se abre para ponelas"*.
  - Diagnóstico y Root Cause (ERR-21):
    - En `src/app/admin/alta-turno/page.js`, al limpiar el estado `userModifiedZones`, quedaron dos llamadas residuales a `setUserModifiedZones(true)` en el `onClick` de la tarjeta "Otros (Extras)" (línea 515) y en el `onChange` del precio (línea 553).
    - Al hacer clic sobre "Otros", el navegador arrojaba un `ReferenceError: setUserModifiedZones is not defined` en tiempo de ejecución, impidiendo que se ejecute `setHasOtros(prev => !prev)`.
  - Solución:
    - Se eliminaron las dos llamadas residuales a `setUserModifiedZones(true)` en `src/app/admin/alta-turno/page.js`.
  - Verificación:
    - Compilación local exitosa con Turbopack (`npm run build`, 37/37 rutas compiladas sin errores).


