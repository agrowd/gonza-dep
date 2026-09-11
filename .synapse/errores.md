# errores.md - Registro de Errores Encontrados y Soluciones

## ERR-01: Colisión de Puertos con landing page (2026-06-18)
**Síntoma:** Al entrar a la agenda se veía la landing page de Nexte.
**Root Cause:** El puerto 3005 ya estaba tomado en el VPS por la web principal.
**Solución:** Se cambió el puerto interno a 3006 en la configuración de PM2, Nginx y deploy.sh.
**Estado:** ✅ FIXED

## ERR-02: TypeError en SidebarNav por usePathname() retornando null en SSR (2026-06-23)
**Síntoma:** Crash del cliente mostrando "This page couldn't load" inmediatamente después del login.
**Root Cause:** `usePathname()` devuelve `null` temporalmente durante la fase inicial de hidratación/SSR, lo que hacía fallar a `pathname.startsWith()`.
**Solución:** Se aplicó validación condicional `pathname ? pathname.startsWith(...) : false` en `SidebarNav.js`.
**Estado:** ✅ FIXED

## ERR-03: ReferenceError: zonasText is not defined (2026-06-23)
**Síntoma:** La página de la agenda del administrador se rompe mostrando un error de renderizado en React.
**Root Cause:** Typo en `src/app/admin/agenda/page.js`, la variable se declaró como `zonesText` pero se renderizó como `zonasText`.
**Solución:** Se renombraron las referencias de declaración a `zonasText` para coincidir con el llamado del render.
**Estado:** ✅ FIXED
## ERR-04: Fallo en creación de preferencia de MercadoPago por auto_return (2026-06-23)
**Síntoma:** Al finalizar el proceso de reserva en la landing, el botón de MercadoPago no abría la pasarela de pagos.
**Root Cause:** La API de MercadoPago rechaza la creación de preferencias con `auto_return: 'approved'` si los `back_urls` no son dominios HTTPS válidos (nuestro `.env` tenía configurado el IP local `http://187.127.9.216:3006`).
**Solución:** Se actualizó `NEXT_PUBLIC_APP_URL` en el archivo `.env` del VPS a `https://agenda.depilacionparahombres.com` y se recompiló la aplicación en producción.
**Estado:** ✅ FIXED

## ERR-05: ReferenceError: endOfWeek is not defined en notificaciones (2026-06-23)
**Síntoma:** Al ingresar a la sección de notificaciones, la lista de turnos para enviar recordatorios aparece vacía.
**Root Cause:** En el endpoint de la API `src/app/api/admin/notificaciones/route.js`, el JSON devuelto intentaba acceder a `startOfWeek` y `endOfWeek`, variables que no estaban declaradas en todos los scopes del método GET.
**Solución:** Se reemplazaron las variables devueltas por `startRange` y `endRange`, las cuales están siempre definidas en la firma del método.
**Estado:** ✅ FIXED

## ERR-06: ReferenceError: timeToMinutes is not defined en creación/edición de turnos (2026-06-23)
**Síntoma:** Al intentar guardar un bloqueo manual o reprogramar un turno, la petición devuelve error 500 y no guarda los datos.
**Root Cause:** En `src/app/api/admin/turnos/route.js` y `src/app/api/admin/turnos/[id]/route.js` se utilizó la función auxiliar `timeToMinutes` para calcular la duración, pero la función no estaba declarada ni importada en ninguno de los dos archivos.
**Solución:** Se declaró el helper `timeToMinutes` al inicio de ambos archivos de ruta.
**Estado:** ✅ FIXED

## ERR-07: 501 5.1.7 Bad sender address syntax - Emails no se envían (2026-06-25)
**Síntoma:** Los emails de confirmación, cancelación e inasistencia nunca llegan al cliente. Los logs de PM2 muestran `Mail command failed: 501 5.1.7 Bad sender address syntax` en el comando `MAIL FROM`.
**Root Cause:** La variable `SMTP_FROM` en el `.env` del VPS contenía comillas escapadas con backslash (`\"Gonzalo Depilación\" <turnos@...>`) que dotenv de Node.js interpretaba literalmente, produciendo un valor `"Gonzalo Depilación" <turnos@...>` (con comillas literales dentro), lo cual es una dirección de remitente inválida para el servidor SMTP de Hostinger.
**Solución:** Se refactorizó `src/lib/email.js` para usar el formato de objeto de dirección de Nodemailer `{name: 'Gonzalo Depilacion', address: 'turnos@...'}` en vez de construir la dirección desde una variable de entorno con caracteres especiales. Se simplificó `SMTP_FROM` en el VPS a solo la dirección de email.
**Estado:** ✅ FIXED

## ERR-08: Duración de turno inconsistente entre disponibilidad y resumen (2026-06-25)
**Síntoma:** En la pantalla de confirmación de reserva, el resumen muestra "14:00 a 14:30 (40 min)" — la hora fin dice 14:30 (30 min de duración) pero el texto dice 40 min.
**Root Cause:** La API de disponibilidad (`/api/disponibilidad`) calculaba los slots con `calculateTurnDetails(zones, false)` (sin bonus de nuevo cliente = 30 min para Brazos), pero la pantalla de resumen usaba `calculateTurnDetails(zones, true)` (con bonus = 40 min). El `horaFin` del slot era correcto (14:30) pero la duración mostrada era la del cálculo con bonus (40 min). Además, la API de creación de reservas (`/api/reservas/crear`) también usaba el flag `isNewClient` basado en si el cliente era nuevo en la DB, lo que generaba un `horaFin` diferente al que se mostraba al usuario.
**Solución:** Se unificó el cálculo usando `isNewClient=false` consistentemente en: (1) la búsqueda de disponibilidad, (2) el resumen del frontend, y (3) la API de creación de reservas. El bonus de nuevo cliente es un margen operativo interno, no debe afectar lo que ve el cliente.
**Estado:** ✅ FIXED

## ERR-09: ReferenceError: valorTotal is not defined al abrir turno en la Agenda (2026-08-12)
**Síntoma:** Cartel rojo de "Ocurrió un error en el sistema" con "Error: valorTotal is not defined" al hacer clic en cualquier turno de la agenda.
**Root Cause:** En la función `getUpdatedTurnoPrices` de `src/app/admin/agenda/page.js`, las variables `valorTotal` y `bonificacion` no estaban declaradas con `let` antes del bloque condicional `if (hasDiscount) ... else ...`, provocando un ReferenceError en tiempo de ejecución de React al abrir el detalle del turno.
**Solución:** Se declararon explícitamente `let valorTotal = currentBaseTotal;` y `let bonificacion = 0;` al inicio del cálculo de precios actualizados.
**Estado:** ✅ FIXED

## ERR-10: Inyección de Zonas Duplicadas por Seed de Proyecto IA (`ia-gonzadep`) (2026-08-14)
**Síntoma:** En la agenda aparecieron zonas duplicadas ("Espalda Completa", "Pecho", "Abdomen", "Piernas Completas", "Barba y Cuello", etc.) con precios y nombres no oficiales.
**Root Cause:** El nuevo proyecto `/srv/ia-gonzadep` se conectaba a la misma base de datos PostgreSQL `agenda_db` y su `seed.js` ejecutaba un catálogo de zonas genéricas en cada inicio/despliegue.
**Solución:** Se eliminaron las 8 zonas duplicadas de la base de datos PostgreSQL, se desactivó el seeding de zonas en `/srv/ia-gonzadep/prisma/seed.js` y se reinició la aplicación. La base de datos ahora contiene exclusivamente las 10 zonas oficiales.
**Estado:** ✅ FIXED

## ERR-11: Capping a las 20:00 hs al buscar disponibilidad en Alta de Turno (2026-09-04)
**Síntoma:** Al buscar turnos en `/admin/alta-turno` con franja horaria "Hasta las: 10:00 p.m." (22:00) y duración de 90 min, el último turno retornado era `18:30 hs ➔ 20:00 hs`, no mostrando horarios posteriores como `20:30 hs ➔ 22:00 hs`.
**Root Cause:** En `src/app/api/admin/alta-turno/disponibilidad/route.js`, el cálculo de `filterEndMin` utilizaba `Math.min(workEndMin, timeToMinutes(horaHasta))`. Dado que la configuración general de atención en base de datos tiene `work_end = '20:00'`, `Math.min('20:00', '22:00')` se limitaba a las 20:00 hs ignorando la búsqueda extendida del operador.
**Solución:** Se actualizó la API para utilizar directamente los minutos provistos por el operador (`timeToMinutes(horaHasta)` y `timeToMinutes(horaDesde)`) sin recortar con `work_start`/`work_end` cuando son ingresados manualmente.
**Commit:** `b4acae3`
**Estado:** ✅ FIXED

## ERR-12: Desfase en recordatorios automáticos de WhatsApp por intervalo de polling (2026-09-06)
**Síntoma:** Los recordatorios de 48hs de WhatsApp salieron a las 10:08 hs en vez de a las 10:00 hs en punto.
**Root Cause:** `startReminderCron` utilizaba `setInterval` de 15 minutos (`15 * 60 * 1000`). Si el servidor se iniciaba a las XX:08 (o XX:23, etc.), el primer chequeo dentro de la ventana de las 10:00 AM caía a las 10:08 AM.
**Solución:** Se redujo el intervalo de polling a 1 minuto (`60 * 1000`), ejecutando el despacho inmediatamente en el minuto 10:00:xx AM.
**Estado:** ✅ FIXED

## ERR-13: Modal de edición cerrado al reprogramar turno desde Alta de Turno (2026-09-06)
**Síntoma:** Al seleccionar un nuevo horario en Alta de Turno con `modo=reprogramar`, la pantalla regresaba a la agenda pero no mostraba ninguna ventana modal para confirmar los cambios.
**Root Cause:** En `src/app/admin/agenda/page.js`, al procesar `reprogramarTurnoId`, se invocaba `setIsEditing(true)` pero se omitía `setIsDetailsOpen(true)`. El modal principal solo se renderiza si `isDetailsOpen && selectedTurno` es verdadero.
**Solución:** Se agregó la llamada a `setIsDetailsOpen(true)` y se sincronizó `selectedDate` y `currentWeekStart` con la nueva fecha seleccionada.
**Estado:** ✅ FIXED

## ERR-14: Error interno al guardar turno desde "Programar Siguiente Turno" por truncamiento con parseInt (2026-09-07)
**Síntoma:** Al agendar un turno mediante "Programar Siguiente Turno", tras seleccionar el nuevo horario y tocar "Guardar Turno" en el modal, saltaba un popup rojo con "⚠️ Error interno" y el turno no se guardaba.
**Root Cause:** En `src/app/admin/agenda/page.js`, al leer `clienteIdParam` de la URL, se hacía `(parseInt(clienteIdParam, 10) || clienteIdParam)`. Cuando el UUID del cliente en PostgreSQL iniciaba con dígitos (ej: `24ae95df-...`), `parseInt` truncaba el UUID extrayendo únicamente el número entero `24`. Al enviar `{ clienteId: 24 }` (tipo Int) a `POST /api/admin/turnos`, Prisma fallaba con `PrismaClientValidationError: Expected String, provided Int` en `prisma.cliente.findUnique({ where: { id: finalClienteId } })`.
**Solución:** 
1. Se reemplazó el casteo erróneo en `src/app/admin/agenda/page.js` por `String(clienteIdParam)`, preservando íntegramente el UUID del cliente.
2. En `src/app/api/admin/turnos/route.js`, se aseguró `finalClienteId = clienteId ? String(clienteId) : null`, y se implementó un mecanismo resiliente de resolución de cliente (búsqueda por ID, fallback por DNI/email/WhatsApp, y chequeo seguro de `turnos.length`).
**Estado:** ✅ FIXED

## ERR-15: Endpoint GET /api/admin/turnos/[id] inexistente (405 Method Not Allowed) y rango administrativo restrictivo al reprogramar (2026-09-07)
**Síntoma:** Al tocar "Reprogramar" en un turno y elegir fecha/hora en Alta de Turno, al volver a la agenda no se abre la ventana para guardar o agendar el turno reprogramado, mostrándose la agenda vacía.
**Root Cause:**
1. `src/app/api/admin/turnos/[id]/route.js` no disponía del método `GET` (solo tenía `PUT` y `DELETE`). Al ejecutar `fetch('/api/admin/turnos/' + reprogramarTurnoId)` en la agenda, el servidor devolvía `405 Method Not Allowed`. Como la respuesta no traía el objeto del turno sino un JSON de error o HTML, `setSelectedTurno(turno)` nunca se invocaba y la condición `{isDetailsOpen && selectedTurno && (...)}` permanecía en falso, impidiendo que el modal se renderice.
2. `alta-turno/page.js` utilizaba `router.push()` con query params parciales en lugar de navegación de página completa `window.location.href`, lo que en navegadores móviles causaba transiciones superficiales sin remontar correctamente los hooks.
3. `PUT /api/admin/turnos/[id]` y `POST /api/admin/turnos` validaban rígidamente contra `work_start` y `work_end` de la configuración (12:30 a 22:00 hs), rechazando turnos administrativos en horarios especiales fuera de esa franja (ej. 11:30 o 22:00 a 23:00 hs).
4. `alta-turno/disponibilidad` consideraba como ocupado el propio turno que se estaba reprogramando si el operador deseaba moverlo en el mismo día, y excluía indebidamente turnos activos con estado `REPROGRAMADO`.
**Solución:**
1. Se implementó el método `GET` con autenticación de sesión en `src/app/api/admin/turnos/[id]/route.js` retornando el turno completo con su relación `cliente`.
2. Se flexibilizó el rango horario permitido para operaciones del administrador a `07:00` a `23:00` hs en `PUT /api/admin/turnos/[id]` y `POST /api/admin/turnos`.
3. Se actualizó `alta-turno/page.js` para usar `window.location.href` garantizando montaje fresco con todos los parámetros (`date`, `newDate`, `newTime`, `newHoraFin`, `zones`, `hasOtros`).
4. Se agregó soporte para `excludeTurnoId` en `/api/admin/alta-turno/disponibilidad` y se corrigió el filtro de estados para considerar `REPROGRAMADO` como turno activo que ocupa franja horaria.
## ERR-16: Recálculo automático de seña persistente y fallo silencioso de despliegue en VPS (2026-09-08)
**Síntoma:** Al usar "Programar Siguiente Turno", el modal de agendado de la agenda continúa recalculando automáticamente la seña al 50% de las zonas (ej: $34.500 en vez de $15.500).
**Root Cause:**
1. En el VPS de producción (`/srv/gonzalo-dep`), existía un commit local `9e4884c` no integrado en GitHub, lo cual provocó que `git pull origin main` en `deploy_vps_workspace.js` fallara por divergencia de ramas (`Your branch and origin/main have diverged`). Como consecuencia, el commit `da7f8eb` nunca se desplegó en producción y el servidor siguió ejecutando el build anterior.
2. En `src/app/admin/agenda/page.js`, existía una segunda llamada asíncrona redundante a `setNewTurno` dentro de `fetch('/api/zonas')` que calculaba `calcs.valorSeña` en paralelo al efecto principal de recálculo de precios, y el chequeo de zonas vacías reseteaba `valorSeña: 0` antes de procesar el parámetro de seña.
**Solución:**
1. Se integraron en local los cambios de `9e4884c` de WhatsApp (watchdog de liveness de Chromium, resolución de JID/LID con getNumberId y deduplicación de recordatorios con estado ENVIADO).
2. Se eliminó la llamada redundante a `setNewTurno` en `fetch('/api/zonas')`, dejando la responsabilidad unificada en el efecto centralizado de precios, y se protegió `manualSeñaOverride` contra cualquier reseteo a 0.
3. Se sincronizó el repositorio y se recompiló y desplegó tanto en el entorno de producción (puerto 3006) como en staging (puerto 3008).
**Estado:** ✅ FIXED

## ERR-17: Seña calculada sobre el total original sin descuento (2026-09-09)
**Síntoma:** Al agendar un turno con descuento (ej: 10%), el total se reducía a $68.000 pero la seña se calculaba sobre el valor base de catálogo ($75.000), resultando en $37.500 en lugar del 50% del valor bonificado ($34.000).
**Root Cause:** En el `useEffect` de cálculo de importes, `autoSeña` se obtenía de `calcs.valorSeña`, valor que no contemplaba bonificaciones porcentuales ni fijas.
**Solución:** Se unificó `calculatedAutoSeña = Math.round(finalTotal * 0.5)` y se ajustó la lógica para actualizar señas desfasadas cuando se activa o cambia un descuento.
**Estado:** ✅ FIXED

## ERR-18: Recálculo involuntario de duración al seleccionar horario en Siguiente Turno (2026-09-09)
**Síntoma:** Al presionar "Agendar Siguiente Turno" para un turno de duración personalizada (ej. 30 min para una zona de 20 min de catálogo), en Alta de Turno la duración se visualiza correctamente en 30 min, pero al seleccionar el slot y abrir el modal en la agenda, la hora fin se recalculaba automáticamente a 20 min.
**Root Cause:** Al recibir los parámetros en `/admin/agenda`, `manualHoraFinOverride` se inicializaba rígidamente en `false`. En consecuencia, el efecto de React `newTurno` recalculaba `horaFin` en base a la duración del catálogo de zonas base.
**Solución:** Se activó `manualHoraFinOverride: Boolean(horaFinParam || (timeParam && searchParams.has('duracion')))` y se sincronizó `autoHoraFin`. Si el operador cambia las zonas en el modal (`toggleNewTurnoZone`), se reactiva el recálculo dinámico.
**Estado:** ✅ FIXED

## ERR-19: Sobrescritura de nombres de clientes con notas de WhatsApp por el bot de IA (2026-09-10)
**Síntoma:** Varios turnos en la Agenda Web (`agenda.depilacionparahombres.com`) aparecían con los nombres de contacto crudos del celular de Gonzalo (ej. `Laser Alan Taborda 23-7-26 Abd $20...`, `Laser Pablo Zincarini 13-8-16 Pier Esp Gl $79k`, `Laser Claudio Maidana`, `Cancelo Laser Ariel Benitez...`).
**Root Cause:** En el servicio `ia-gonzadep` (`/srv/ia-gonzadep/src/lib/whatsapp.js`), la función `syncWhatsAppContactsToDb` ejecutaba `prisma.cliente.update({ where: { id: conv.clienteId }, data: { nombreCompleto: targetName } })` cada vez que el bot iniciaba o reconectaba con WhatsApp. Al leer los 10.335 contactos de la libreta telefónica de Gonzalo, sobreescribía directamente `Cliente.nombreCompleto` en `agenda_db` con las notas clínicas y de precios que Gonzalo anota en su agenda telefónica.
**Solución:**
1. En `/srv/ia-gonzadep/src/lib/whatsapp.js`, se eliminó la actualización a `Cliente.nombreCompleto` en `syncWhatsAppContactsToDb`, restringiendo `targetName` únicamente al modelo `ConversacionWsp.nombreContacto`.
2. Se protegió la auto-extracción de nombres en saludos de chat para que no sobreescriba nombres válidos existentes en `Cliente`.
3. Se ejecutó un script de saneamiento que restauró los nombres limpios de los 19 clientes afectados en `agenda_db` y migró de manera segura cualquier detalle o nota de precios/fechas al campo `Cliente.notasGonzalo`.
4. Se recompiló `ia-gonzadep` (`npm run build`) y se reinició el servicio en PM2, verificando en vivo que tras el sync no se altere ningún registro de `Cliente`.
**Estado:** ✅ FIXED

## ERR-20: Ranuras a 10 min en filtro de 30 min, fallo de notificaciones WhatsApp por doble sesión y sobreescritura de seña cargada (2026-09-10)
**Síntoma:**
1. En `/admin/alta-turno`, con "MOSTRAR TURNOS: Cada 30 min", el buscador ofrecía turnos espaciados por 10 minutos (ej: 14:00 -> 14:50 y 14:10 -> 15:00).
2. Los turnos creados no enviaban confirmaciones automáticas de WhatsApp (fallando con `FALLIDO: El servicio de WhatsApp no está conectado`), a pesar de que el operador veía WhatsApp conectado en el bot de IA (`admin.depilacionparahombres.com`).
3. Al agendar el siguiente turno para clientes con señas fijas históricas (ej: Sergio Escalante $13.000) y seleccionar zonas diferentes (Cuerpo Completo $150.000), la seña se recalculaba forzosamente al 50% ($75.000) en lugar de respetar la seña cargada.
**Root Cause:**
1. En `/api/admin/alta-turno/disponibilidad/route.js`, en huecos de 60 min con duración de 50 min, ni la búsqueda forward ni backward cumplían la condición limpia de remanente (`remAfter < 30`). El bloque de fallback agregaba automáticamente el inicio (`gap.start`, 14:00) y el final (`gap.end - duracion`, 14:10), creando ranuras a 10 min de separación.
2. `gonzalo-agenda` (puerto 3006) y `ia-gonzadep` (puerto 3007) corren como procesos independientes. El cliente WhatsApp de `gonzalo-agenda` quedó en `QR_RECEIVED`/desconectado mientras el de `ia-gonzadep` estaba 100% conectado en la misma máquina.
3. En `src/app/admin/alta-turno/page.js`, `displaySeña` dependía de `!userModifiedZones`. Al tildar zonas, `userModifiedZones` pasaba a `true`, anulando `señaParam`. En `src/app/admin/agenda/page.js`, `toggleNewTurnoZone` borraba `manualSeñaOverride: undefined`.
**Solución:**
1. Se reemplazó el algoritmo en disponibilidad por un avance estricto de 30 en 30 minutos desde el inicio del hueco disponible sin bifurcaciones forward/backward ni fallbacks que generen desfases menores a 30 min.
2. Se implementó el endpoint `/api/whatsapp/send` en `ia-gonzadep` y se configuró un relay transparente en `gonzalo-dep` (`src/lib/whatsapp.js`) que delega el envío a dicho endpoint si el cliente local no está conectado, sincronizando además el estado de conexión entre ambos paneles.
3. En `alta-turno`, `displaySeña` preserva incondicionalmente `señaParam` ("traer el valor cargado"). En la agenda, `toggleNewTurnoZone`, `toggleEditTurnoZone`, `setEditTurno` y los selectores de extras preservan `manualSeñaOverride`.
**Estado:** ✅ FIXED
## ERR-21: ReferenceError: setUserModifiedZones is not defined al tocar Otros en Alta de Turno (2026-09-11)
**Síntoma:** Al tocar la tarjeta "Otros (Extras)" en `/admin/alta-turno`, no se abrían los campos de texto y precio para escribir la zona extra.
**Root Cause:** En la limpieza del estado no utilizado de `userModifiedZones`, se eliminó la declaración `const [userModifiedZones, setUserModifiedZones] = useState(false);` pero quedaron dos llamadas activas a `setUserModifiedZones(true)` en el `onClick` de la tarjeta "Otros" y en el `onChange` de `otrosPrecio`. Esto producía un `ReferenceError: setUserModifiedZones is not defined` en tiempo de ejecución al interactuar con el elemento, impidiendo la alternancia de `hasOtros`.
**Solución:** Se eliminaron las dos llamadas residuales a `setUserModifiedZones(true)` en `src/app/admin/alta-turno/page.js`.
**Estado:** ✅ FIXED
