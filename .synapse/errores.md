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
