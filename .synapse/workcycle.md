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

