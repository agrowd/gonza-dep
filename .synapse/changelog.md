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

## [1.2.3] - 2026-07-29
### Fixed
- Reestructuración de tarjetas para turnos de 30 minutos (`duracionMinutos <= 35`): se organizó el contenido en dos líneas verticales (Nombre arriba en negrita y Horario abajo, ej. `15:40 - 16:10`), sin zonas y sin desbordes laterales.
- Adición de línea sutil punteada de guía a los 50px de cada fila horaria en la grilla (`agenda.module.css`) para marcar con precisión visual las medias horas (`:30`).
- Búsqueda case-insensitive (`mode: 'insensitive'`) en `/api/clientes/consultar` para evitar fallos de verificación en la autogestión pública y despliegue de avisos limpios sin error 500.
- Preservación y restauración real de la posición de scroll del contenedor `.gridBody` (`gridBodyRef.current.scrollTop`) al cerrar modales o regresar desde la ficha del cliente.
- Preservación de la fecha en pantalla al conmutar entre las vistas Día, Semana y Mes, agregando un botón dedicado **"📅 Hoy"** para retornar al día actual.
- Formato de 100% de ancho (filas completas) para los campos Nombre, Apellido, DNI, WhatsApp y Email en los modales de agendamiento.
- Exclusión del directorio `.wwebjs_auth` en `git clean -fd` dentro de los scripts de despliegue (`deploy_vps_workspace.js`), preservando la sesión activa de WhatsApp entre actualizaciones sin requerir nuevo escaneo de QR.
- Almacenamiento y preservación del tipo de descuento (`descuentoTipo` `'PORCENTAJE'` o `'PESOS'`) y valor de bonificación en Prisma `Turno` para conservar el 20% al editar o reprogramar citas.
- Texto oscuro de alto contraste (`color: #111111; font-weight: 500`) en el historial de notificaciones enviadas dentro del perfil del cliente (`src/app/admin/clientes/page.js`).
- Permiso habilitado para modificar y reprogramar turnos del día actual (mismo día), independientemente de si la hora pautada ya transcurrió, bloqueándose únicamente al finalizar la jornada a medianoche.
- Calibración milimétrica del formato A4 para impresión y exportación a PDF (`src/app/admin/agenda/imprimir/imprimir.module.css`):
  1. Se ajustó el espaciado para que una jornada completa de 13 a 18 turnos ocupe entre el 75% y 80% de la carilla A4 (con tipografía nítida de `0.80rem` a `0.82rem`, interlineado `1.22` y paddings de `0.35rem 0.45rem`).
  2. Esto resuelve el doble dilema de forma definitiva: no se ve microscópico ni en "media hoja", y al mismo tiempo dispone de un margen de seguridad de 80mm en la base para que el motor de impresión de Chrome en celulares Android/Motorola e iOS NUNCA corte los turnos de la noche (20:30 y 21:00 hs) ni desborde a una segunda página.
- Ajuste equilibrado del tamaño y tipografía de la hoja de impresión A4 (`src/app/admin/agenda/imprimir/imprimir.module.css`):
  1. Se restableció la tipografía corporativa a un tamaño legible y generoso (`1.35rem` en título, `0.92rem` en celdas, `0.94rem` en cliente y `0.88rem` en zonas con interlineado de `1.35` y padding de `0.45rem 0.55rem`), de modo que el contenido ocupe el 85% natural de la hoja A4 en lugar de verse diminuto en "media hoja".
- Adaptación 100% fluida a pantallas de celular sin corte lateral (`src/app/admin/agenda/imprimir/page.js` e `imprimir.module.css`):
  1. Se ajustaron los anchos de columna al 25% (Horario), 37% (Cliente) y 38% (Zonas) con ajuste `overflow-wrap: anywhere` y `padding: 0.35rem 0.2rem` en pantallas móviles (320px a 450px).
  2. Se configuró el contenedor de la hoja para ocupar el 100% exacto del ancho de la pantalla (`100vw; box-sizing: border-box; overflow-x: hidden;`), eliminando por completo el desbordamiento hacia la derecha de la columna "ZONAS A REALIZAR" en teléfonos Motorola y Android.
- Corrección de colisión y superposición de texto en celulares Motorola/Android (`src/app/admin/agenda/imprimir/page.js` e `imprimir.module.css`):
  1. Se eliminó la restricción rígida de `table-layout: fixed` con porcentajes pequeños (22%) que provocaba que la hora (ej. `14:00`) se montara encima del nombre del cliente (ej. `Walter Di Camillo`).
  2. Se implementó `table-layout: auto` con ancho mínimo asegurado para el horario (`min-width: 100px; white-space: nowrap`), permitiendo que el navegador del celular calcule el espacio natural de cada celda sin ninguna colisión de texto.
  3. En la exportación a PDF se conservan los márgenes compactos de `4mm 6mm` y altura de fila de 22px para que los 13 a 18 turnos del día sigan entrando completos en 1 sola carilla A4.
- Rediseño responsive y motor de exportación PDF A4 ultra-compacto (`src/app/admin/agenda/imprimir/page.js` y `imprimir.module.css`):
  1. Vista en pantalla móvil: se agregaron reglas `@media screen and (max-width: 768px)` con reducción de padding de 144px a 8px y anchos de columna proporcionales (`22%`, `38%`, `40%`), eliminando el desbordamiento horizontal y el recorte de las zonas a la derecha en celulares.
  2. Exportación a PDF en celulares y PC: se redujo la altura de fila a 24px, paddings a `2.5px 5px`, y márgenes A4 a `4mm 6mm`, garantizando que hasta 18-20 turnos diarios entren holgadamente en una sola carilla sin cortarse jamás los turnos de la noche (20:30 y 21:00 hs) en iOS Safari ni Android.
- Eliminación definitiva de segunda hoja en blanco en impresión (`src/app/admin/agenda/imprimir/imprimir.module.css`): se ajustaron los márgenes y se eliminaron los márgenes/paddings residuales en el contenedor `.printWrapper` y pie de página, impidiendo que el navegador genere una segunda hoja vacía cuando todos los turnos entran en una sola carilla A4.
- Optimización y compactación de la hoja de impresión A4 (`src/app/admin/agenda/imprimir/page.js` y `imprimir.module.css`): se incorporó un indicador destacado con el conteo total de turnos programados del día (ej. `13 turnos`), se redujeron los márgenes de impresión a `8mm 10mm` y se ajustó el relleno de las filas a `0.4rem 0.6rem`. Esto garantiza que los días de alta concurrencia (13 a 16 turnos diarios) entren de forma completa y nítida en una sola página A4 sin cortar jamás los turnos de la noche a las 21:00 hs ni truncar la tabla.
- Corrección del script de Seed de base de datos (`prisma/seed.js`): se modificó la rutina de inicialización de la base de datos para que NO sobreescriba plantillas de mensajes personalizadas por el usuario (`defaultConfigs`) ni cree nuevamente zonas de depilación eliminadas (`zonasDefault`). Las zonas por defecto solo se inicializan si la tabla está totalmente vacía y las configuraciones solo si la clave no existe previamente. Esto resuelve definitivamente el reinicio no deseado de plantillas de WhatsApp/email y la reaparición de zonas eliminadas (ej. `Rostro` y `Pecho + Abdomen`) tras cada despliegue de código en el servidor VPS.
- Edición directa de importes de venta y seña desde la ventana "Detalle del Turno" (`src/app/admin/agenda/page.js`): se agregaron campos interactivos de entrada numérica para `Valor Total ($)` y `Seña Cobrada ($)` directamente en la vista de detalle del turno, junto con un botón de guardado rápido `💾 Guardar Importes de Turno`. Esto permite modificar cualquier valor al instante sin necesidad de entrar a la pantalla completa de edición.
- Visualización de "Valor Original (Sin Descuento)" (`src/app/admin/agenda/page.js`): se incorporó un cuadro destacado de color dorado en el detalle del turno que muestra el valor original total bruto antes de aplicar bonificaciones cuando el turno cuenta con un descuento (ej. `$75.000` antes del 20%).
- Sincronización del checkbox de notificaciones automáticas con la configuración global (`src/app/admin/clientes/page.js`): se integró la lectura de la clave `global_notifications_enabled` desde `/api/admin/configuracion` al cargar el módulo de clientes, garantizando que el checkbox "Enviar notificaciones automáticas" respete el estado activo o inactivo del switch global al crear o editar clientes.
- Corrección de retención/pérdida de seña en cancelaciones administrativas (`src/app/api/admin/turnos/[id]/route.js` y `src/lib/email.js`): se ajustó la condición `withLossOfDeposit` para que respete estrictamente la decisión manual del operador (`preserveDeposit = false` => el cliente pierde la seña / se aplica penalidad) sin importar que el turno fuera cancelado con más de 72 horas de anticipación. Esto soluciona la inconsistencia por la cual se enviaba un correo informando que la seña quedaba a favor cuando el operador elegía explícitamente retenerla.
- Corrección de filtrado de fecha exacta para impresión de agenda (`src/app/api/admin/turnos/imprimir/route.js`): se reemplazó la comparación mixta `rawIsoStr === fecha || localDateStr === fecha` por la comparación unívoca y estricta `rawIsoStr === fecha`. Esto elimina la duplicación y mezcla de turnos de dos días consecutivos provocada por la conversión de zona horaria UTC a medianoche.
- Corrección de actualización de precios automatizados al agendar la próxima sesión (`src/app/admin/agenda/page.js`): se eliminó la preservación de `manualTotalOverride` y `manualSeñaOverride` del turno anterior al agendar la siguiente cita (`handleScheduleNextTurn`). Esto permite que el sistema recalcule automáticamente los montos y señas vigentes según las zonas seleccionadas y las tarifas actualizadas de la base de datos, en lugar de arrastrar el importe antiguo del turno previo.
- Corrección definitiva de desbordamiento horizontal de menús desplegables (`<select>`) en iOS Safari (`src/app/globals.css` y `src/app/admin/agenda/agenda.module.css`): se incorporaron reglas globales con `max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important;` y reducción de padding en `.glass-card` en móviles (`@media (max-width: 600px)`). Esto corrige el comportamiento nativo de WebKit que calculaba el ancho del elemento `<select>` basándose en el texto de las opciones más largas (ej. *"Pendiente de Autorización"*), inflando el modal por encima de los 375px del iPhone y provocando el recorte/desplazamiento a la izquierda.
- Corrección de desbordamiento de campos de horario en ventanas emergentes en móviles (`src/app/admin/agenda/agenda.module.css` y `src/app/admin/agenda/page.js`): se cambió `.inputRow` a `flex-direction: column` en pantallas de celulares (`max-width: 600px`). Esto evita que los controles nativos de horario de iOS Safari (`Hora Inicio` y `Hora Fin`), al estar en paralelo, superen los 375px de ancho de los iPhones y fuercen el desplazamiento horizontal o el recorte de los botones de la ventana.
- Corrección de desplazamiento y recorte horizontal en ventanas emergentes en móviles (`src/app/admin/agenda/agenda.module.css` y `src/app/admin/agenda/page.js`): se ajustaron las reglas `.modalOverlay` y `.modalContent` con `width: 100vw; max-width: 100vw; box-sizing: border-box; overflow-x: hidden;` y se convirtió el contenedor de botones de acciones rápidas a `display: flex; flex-wrap: wrap; flex: 1 1 calc(50% - 0.5rem)` para evitar que botones con textos extensos fuercen un ancho superior a la pantalla (ej. iPhone) y provoquen el desplazamiento horizontal/recorte hacia la izquierda.
- Corrección de duplicación de fechas en plantillas de correo (`src/lib/email.js`): se separó la variable `{día}` (que ahora contiene únicamente el nombre del día, ej. `"Jueves"`) de la variable `{fecha}` (que contiene el número, mes y año, ej. `"13 de agosto de 2026"`). Esto elimina la duplicación en plantillas con la estructura `- Fecha: {día}, {fecha}`, produciendo un resultado único y limpio: `- Fecha: Jueves, 13 de agosto de 2026`.
- Corrección de color de enlaces automáticos de fecha/hora en correos (`src/lib/email.js`): se configuraron las etiquetas de fecha (`{fecha}`, `{día}`), horario (`{horario}`) y detectores de calendario de Outlook/Gmail/iOS Mail para forzar el color dorado de la marca (`#d4a54d !important`). Esto elimina el azul oscuro predeterminado de los teléfonos y aplicaciones de correo sobre fondos negros, logrando un contraste brillante y legibilidad perfecta.
- Separación de botones *"✓ Realizado"* y *"🏁 Finalizar Tratamiento"* en la ficha del turno (`src/app/admin/agenda/page.js` y `src/app/api/admin/turnos/[id]/route.js`): se implementaron dos botones independientes dentro del modal de detalle de turno:
  1. **`✓ Realizado` (Verde):** marca la cita del día como cumplida (`turno.estado = 'REALIZADO'`).
  2. **`🏁 Finalizar Tratamiento` (Azul):** marca la cita como realizada y actualiza el estado general del cliente a `'FINALIZADO'`, habilitando el flujo de recordatorios de mantenimiento a los 2 meses.
- Corrección definitiva de zona horaria en la API de impresión (`src/app/api/admin/turnos/imprimir/route.js`): se utilizó el formateador dinámico `toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })` para comparar las fechas de los turnos contra el día local deseado. Esto resolvió que los turnos nocturnos (posteriores a las 17:30 hs de Argentina / 20:30 UTC) cambiaran de fecha al día siguiente en formato UTC y fueran excluidos de la impresión. Ahora se incluyen **el 100% de los turnos del día** (Diego Claure, Santino Siri, Julián Gomez, Brian Cardozo, Alejandro Remonda, Stefan Manzano) en las 2 hojas generadas.
- Eliminación de recorte en impresión de PDF multipágina (`src/app/admin/agenda/imprimir/imprimir.module.css`): se eliminaron las propiedades `display: flex`, `flex: 1` y `min-height: 297mm` dentro de los bloques de impresión (`@media print`), reemplazándolas por flujo de bloque estándar (`display: block`, `display: table`, `height: auto`, `overflow: visible`). Esto resuelve el problema de que los navegadores WebKit/Blink (Chrome, Edge, Safari) recortaran el PDF al final de la página 1 (`Página 1 de 1`) en lugar de generar una segunda hoja con los turnos restantes de la tarde y noche. Se añadió `display: table-header-group` para repetir los encabezados en cada hoja.
- Corrección en la Impresión de la Agenda del Día (`src/app/api/admin/turnos/imprimir/route.js`, `src/app/admin/agenda/imprimir/page.js` y `imprimir.module.css`): se corrigió el filtro de fecha en la API de impresión agregando margen de búfer UTC y ordenamiento cronológico por minutos exactos (`timeToMinutes`). Esto resuelve que los turnos agendados por la tarde/noche (posteriores a las 16:00, 18:00, 20:00 hs) quedaran omitidos por desfasaje de zona horaria. Además, se incluyeron las zonas personalizadas (`otrosTexto`) y observaciones del operador, e implementamos paginación limpia (`page-break-inside: avoid`) en la hoja PDF/impresora para imprimir la jornada completa sin recortes.
- Ocultamiento de turnos cancelados en la grilla de la Agenda (`src/app/admin/agenda/page.js`): se implementó el filtro `showCancelled` (por defecto desactivado) e interruptor *"🙈 Ocultar Cancelados / 👁️ Ver Cancelados"* en la barra superior. Los turnos en estado `CANCELADO` ya no colapsan ni achican los bloques de los turnos activos en el calendario visual, logrando una vista limpia de ancho completo. **Los turnos cancelados se conservan intactos en la base de datos PostgreSQL, en el Historial del Cliente y en las Estadísticas**, evitando que el usuario los elimine físicamente.
- Corrección de contraste y enlaces azules automáticos en correos de iOS / Apple Mail (`src/lib/email.js`): se agregaron reglas CSS específicas de `x-apple-data-detectors` y se envolvió la fecha, el horario y la dirección en enlaces explícitos `<a href="#" style="color: #ffffff !important; text-decoration: none !important;">` en todas las plantillas de correo. Esto evita que clientes de correo en iPhone/iPad/Mac fuercen el color azul predeterminado de enlace sobre el fondo negro de la plantilla, logrando un texto **blanco puro de alto contraste y legibilidad perfecta**.
- Nombre del día de la semana en notificaciones de WhatsApp (`src/lib/whatsapp.js` y `prisma/seed.js`): se actualizó `parseTemplate` para que todas las notificaciones de WhatsApp que mencionen fechas incluyan automáticamente el nombre del día en español (ej. *Viernes 04/09/2026* o *Viernes 4 de Septiembre*). Si una plantilla no incluye la etiqueta `[Día]`, la variable `[FechaTurno]` antecede automáticamente el nombre del día en mayúsculas, garantizando que el cliente lea siempre el día exacto de la cita.
- Parseo de plantillas de WhatsApp al agendar turnos manualmente (`src/app/api/admin/turnos/route.js`): se integró la función `parseTemplate` completa en la creación manual de turnos, permitiendo que variables como `[Día]`, `[Dia]`, `[DíaCompleto]`, `[DiaCompleto]` y `[FechaTurno]` se reemplacen por el nombre del día y la fecha formateada (ej. *Miércoles 12 de agosto*), resolviendo que aparecieran literalmente como texto sin procesar.
- Botón *"✓ Finalizado"* y Agendar sobre turnos cancelados (`src/app/admin/agenda/page.js`): se destacó el botón de estado en verde vibrante con la leyenda *"✓ Finalizado"* para marcar turnos concluidos. Asimismo, para los turnos en estado `CANCELADO`, se incorporó el botón de acción directa *"➕ Agendar Nuevo Turno en este Horario"*, el cual abre la ventana para registrar un nuevo turno pre-llenando la misma fecha y hora sin tener que eliminar el turno cancelado ni perderlo del historial del cliente ni de las estadísticas.
- Preservación de seña fija y precio original al editar turnos (`src/app/admin/agenda/page.js`): al abrir el modal de edición (*"Editar Turno"*), la seña previa abonada por el cliente (`valorSeña`) queda **estrictamente fija**, evitando que el sistema la recalcule al 50% al tildar o destildar zonas adicionales. Asimismo, el cálculo del valor total opera ahora de forma **incremental**: conserva el precio personalizado original del turno y le suma o resta el valor de catálogo de las zonas agregadas o quitadas. Si se vuelve a destildar la zona agregada, se restaura exactamente el precio total anterior sin alterar la seña ni perder valores personalizados.
- Estructura y formato en correos electrónicos (`src/lib/email.js`): se implementó la función unificada `formatEmailParagraphs` que convierte automáticamente los saltos de línea de las plantillas en párrafos HTML explícitos `<p style="margin: 0 0 16px 0; line-height: 1.65;">`. Se eliminó la dependencia de `white-space: pre-line` que provocaba que clientes como Gmail en iOS/Android colapsaran el texto en un solo bloque pegado. Además, se aplicó resalte bicolores y alto contraste (`<strong style="...">`) a los datos clave (`{cliente}`, `{fecha}`, `{horario}`, `{zonas}`, `{seña}`, `{saldo}`).
- Estilo del título de Observaciones del Operador (`src/app/admin/agenda/page.js`): se adaptó el rótulo del campo a la clase estándar `styles.detailLabel` (mayúsculas oscuras y sobrias) alineado con los títulos *Frecuencia Estimada* y *Observaciones Generales del Cliente*.
- Observaciones del Operador en el modal de turno directo (`src/app/admin/agenda/page.js`): se incorporó el campo de texto *"🩺 Observaciones del Operador (Potencia, Clínica, Indicaciones)"* en la pantalla principal de detalles del turno (`Detalles del Turno`), permitiendo a Gonzalo cargar la potencia del láser (J), sensibilidades y notas clínicas en tiempo real sin tener que ir a la Ficha del Cliente ni salir de la agenda.
- Corrección del desplazamiento de turnos en la grilla (`src/app/admin/agenda/page.js`): `getAppDateStr` extrae directamente la porción YYYY-MM-DD de las cadenas de fecha ISO recibidas de Prisma (`fechaInput.split('T')[0]`), evitando que la conversión por zona horaria de JavaScript desplazar los turnos un día hacia atrás (ej. de Lunes 3 a Domingo 2).
- Corrección del cálculo automático de seña al tildar zona (`src/app/admin/agenda/page.js`): al abrir el modal de nuevo turno y seleccionar una zona, la seña auto-calculada ya no se queda en `0`, utilizando `calcs.valorSeña` a menos que el usuario haya editado manualmente el campo de seña.
- Ampliación de variables en plantillas de WhatsApp (`src/lib/whatsapp.js`): se agregaron expresiones regulares flexibles para soportar `[Día]`, `[Dia]`, `[Día Completo]`, `[Dia Completo]`, `[DiaCompleto]`, `[DíaCompleto]` con y sin tilde o espacio.
- Espaciado y formato en la sección de recordatorios del correo de confirmación (`src/lib/email.js`): se separaron los puntos de aviso bajo *"⚠️ Recordatorios importantes:"* en elementos de párrafo `<p>` con márgenes e interlineado independiente (`margin-bottom: 10px`, `line-height: 1.5`), evitando que el texto quede amontonado o pegado.
- Normalización y solución al desfase de fechas en la agenda por zona horaria (`src/app/admin/agenda/page.js`): se implementaron las funciones auxiliares seguras `toYYYYMMDD` y `parseYYYYMMDD` eliminando todas las llamadas nativas `.toISOString().split('T')[0]`. Esto evita que al acceder a la agenda en horario nocturno (ej: 21:00 hs Argentina UTC-3) la conversión a UTC desplace el selector e informe de turnos al día siguiente mientras el título de cabecera muestra el día actual.
- Preservación de seña fija y valor total al agendar siguiente turno (`src/app/admin/agenda/page.js`): al accionar **"Programar Siguiente Turno"**, la seña (`valorSeña`) queda bloqueada e inmutable aunque se agreguen o tilden zonas adicionales en el modal, recalculando únicamente el valor total de las zonas seleccionadas.
- Configuración de horarios laborales independientes para Autogestión / Reserva Online de Clientes (`booking_work_start: "14:00"`, `booking_work_end: "22:00"`) vs Agenda Interna (`work_start: "12:30"`, `work_end: "22:00"`): se agregaron los selectores independientes en **Configuración > Horarios Laborales** (`src/app/admin/configuracion/page.js`) y se vinculó la API pública de disponibilidad (`/api/disponibilidad`) para que los clientes solo puedan agendar de 14:00 a 22:00 hs.
- Protección de zonas, precios, señas y plantillas de mensajes frente a despliegues (`prisma/seed.js`): se cambió la regla `update: {}` en los `upsert` de base de datos para garantizar que cualquier ajuste de precios, zonas o mensajes realizado por Gonzalo se conserve 100% intacto en los siguientes despliegues del VPS.
- Personalización automática con día y hora del turno en los recordatorios de WhatsApp (`src/lib/whatsapp.js`, `prisma/seed.js`, `src/app/api/admin/configuracion/route.js`): se ampliaron los reemplazos de plantilla para incluir `[DiaCompleto]`, `[HoraInicio]` y `[HoraFin]`. Se actualizó la plantilla por defecto para enviar mensajes automáticos 48hs antes con el día y hora exactos de la cita (ej: *"el Sábado 1 de agosto a las 11:30 hs"*), evitando consultas de clientes y permitiendo al administrador personalizar o modificar las plantillas desde la solapa de Configuración.
- Corrección del cálculo de descuentos y resumen financiero en la agenda: el descuento por porcentaje o monto fijo se aplica sobre el precio total acordado y se descuenta del **Monto Final de Venta** y del **Saldo a Pagar en Local**.
- Corrección del error `ReferenceError: sendingReceipt is not defined` definiendo el hook de estado `sendingReceipt` en la agenda.
- Normalización por cadena (`String(id) === String(z.id)`) en la selección y cálculo automático de total de venta al tildar zonas, garantizando que el precio autocompletado aparezca al instante sin quedar en `$0`.
- Ajuste definitivo del diseño del modal en celulares reemplazando `gridColumn: 'span 2'` por `gridColumn: '1 / -1'` y `box-sizing: border-box`, eliminando cualquier recorte a la derecha en pantallas estrechas.
- Configuración de `flex-direction: row` en `.inputRow` para garantizar que los horarios de `Hora Inicio` y `Hora Fin` permanezcan uno al lado del otro (`al lado`) en celulares sin ser sobreescritos por media queries.
- Búsqueda insensible a mayúsculas/minúsculas con coincidencia flexible (`equals` / `contains`) y aviso claro en la verificación de email de Autogestión Pública.

## [1.2.2] - 2026-07-23
### Fixed
- Alto contraste negro (`color: #111111; font-weight: 600`) para la visualización de zonas e historial de turnos en las tarjetas de la ficha del cliente (`clientes.module.css`).
- Preservación de precios, seña y duración personalizadas al abrir el modal de reprogramación/edición de turnos administrativos (`src/app/admin/agenda/page.js`).
- Alineación de grilla horaria en la agenda: se corrigió el conteo de filas de fondo en `gridLines` a `Array.from({ length: endHour - startHour })` y se implementó cálculo dinámico de `endHour = maxAppEndHour` para extender el horario si existen citas agendadas hasta las 22:00 hs.
- Cálculo dinámico exacto de duración en el modal de detalle del turno (`timeToMinutes(fin) - timeToMinutes(inicio)`) resolviendo desajustes como `20:00 a 20:50 (60 min)`.
- Corrección de la firma de notificaciones en `src/lib/whatsapp.js`: el chequeo de notificaciones previas de WhatsApp ahora valida explícitamente `[RECORDATORIO_48H]`, impidiendo que las confirmaciones o recibos bloqueen el envío automático de recordatorios. Se añadió plantilla fallback obligatoria para Email a 7 días.
- Formato compacto en línea única (`Nombre (16:30 - 17:00)`) para citas de $\le 30$ minutos en la grilla del calendario, eliminando desbordes verticales y colisiones entre turnos adyacentes.
- Preservación de la posición de scroll (`scrollTop`) de la grilla de la agenda al cerrar modales de turno o al retornar desde la ficha de cliente (`sessionStorage`).
- Consulta síncrona de rango de fechas en `fetchAppointments()` a partir de `currentWeekStart`, eliminando retrasos o vistas vacías al cambiar de semana.
- Cálculo de descuentos (porcentaje o monto fijo) basado en la anulación manual del "Total de Venta ($)" cuando el operador modifica manualmente el precio total del turno.
- Activación oficial de la casilla de correos de respaldo `backup.gonzalodepilacion@gmail.com` en `src/lib/email.js` (BCC en todas las notificaciones por email).

### Added
- Gestión de múltiples turnos activos en el portal de autogestión pública (`/api/clientes/consultar` y `src/app/page.js`): ahora los clientes pueden visualizar todos sus turnos agendados y reprogramar o cancelar de forma independiente cada uno de ellos.
- Selector e input de Frecuencia Estimada (Semanas) directamente en el modal de detalle del turno con guardado instantáneo a la ficha del cliente (`src/app/admin/agenda/page.js`).
- Redirección automática de la vista del calendario al presionar "Programar Siguiente Turno": ubica al usuario en la semana objetivo (`fechaTurno + frecuencia * 7 días`) permitiendo visualizar los turnos libres antes de agendar.

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
