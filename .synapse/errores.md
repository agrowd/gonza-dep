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
