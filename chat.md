# Chat Log - Gonzalo Depilación (gonzalo-dep)

## Sesión: 1 de Octubre de 2026 - Implementación y Despliegue de Ajustes de Interfaz & Ficha (Damián Parapugno & Luciano Gómez)

### Requerimientos Implementados:
1. **Fecha de Cumpleaños en Modal de Agenda**:
   - Agregada la fila `🎂 Fecha de Cumpleaños` en la tarjeta clínica del modal de turno (debajo de `Sesiones Realizadas`), con título a la izquierda e input de fecha a la derecha (`<input type="date">`), sincronizado bidireccionalmente con `Cliente.fechaNacimiento`.
2. **Comentario Automático por Cambio de Frecuencia**:
   - Al modificar la frecuencia del cliente (ej: de 5 a 6 semanas), el backend concatena automáticamente la etiqueta `[Frecuencia de turno cambiada de 5 a 6]` en `Turno.observaciones`.
3. **Selector de Método de Pago**:
   - Incorporado el campo `metodoPago` (`EFECTIVO` / `TRANSFERENCIA`) en el esquema Prisma de `Turno`, con selector interactivo (`💵 Efectivo` / `🏦 Transferencia`) en la vista de detalle de turno.
4. **Preservación de Posición de Scroll en la Agenda**:
   - Corregido el retorno desde la Ficha del Cliente hacia la Agenda utilizando `sessionStorage` para guardar `agenda_scroll_pos` y `agenda_window_scroll`, aplicando restauración asíncrona (`setTimeout` 100ms / 300ms) para evitar saltos al top (0,0).
5. **Renombrado de Pestañas & Limpieza**:
   - En `SidebarNav.js`, renombrada la pestaña "Agenda" por "Agenda de Turnos" y rediseñado el botón "Ver Reserva Online" del pie.
   - En `clientes/page.js`, renombrada la pestaña "⚙️ Configurar" por "⚙️ ABM Clientes" y removido el bloque "Observaciones Administrativas".

### Estado de Despliegue:
- Compilación local probada y limpia (`npm run build`, 41/41 rutas).
- Cambios empujados a `main` y `staging` en GitHub (`06cf980`).
- Desplegado y verificado en el VPS Hostinger (`187.127.9.216`):
  - Producción: `http://localhost:3006` (`https://agenda.depilacionparahombres.com`) -> PM2 `gonzalo-agenda` ONLINE
  - Staging: `http://localhost:3008` -> PM2 `gonzalo-agenda-staging` ONLINE

## Sesión: 1 de Octubre de 2026 - Corrección Integral de Visualización Móvil ("Las fichas se ven cortadas") (Damián Parapugno)

### Problemas Resueltos:
1. **Recorte Lateral Derecho de Importes**:
   - En `VALOR ORIGINAL`, `SEÑA`, `SALDO`, `MÉTODO DE PAGO` y `DESCUENTO`, se protegió la etiqueta con `flex: 1 1 auto; min-width: 0; word-break: break-word` y el valor numérico con `flex: 0 0 auto; max-width: 55%; white-space: nowrap`. Ningún número se corta en el borde derecho en pantallas móviles (360px). Damián confirmó: *"Acá quedó bien sin cortar"*.
2. **Eliminación de la Trampa de Doble Scroll**:
   - Se configuró `.modalOverlay` con `overflow: hidden !important` y centrado flex. `.modalContent` actúa como único contenedor de desplazamiento con scroll táctil suave (`-webkit-overflow-scrolling: touch; overscroll-behavior: contain`) y `padding-bottom: 3.5rem !important`, despejando completamente el panel de acciones rápidas y el botón eliminar.
3. **Restauración del Color Original Glassmorphism**:
   - Atendiendo a la preferencia de Damián (*"el color déjalo como estaba antes que estaba bueno"*), se removió el fondo plano forzado y se restableció el efecto `glass-card` con `backdrop-filter: blur(16px)` y sombras refinadas.
4. **Corrección de Apilado Vertical en "💳 Método de Pago"**:
   - Se removió `wordBreak: 'break-word'` y `minWidth: 0` que provocaban que las letras de `💳 Método de Pago` se apilaran verticalmente en 1ch. Se fijó `whiteSpace: 'nowrap'`, `flexShrink: 0`, `minWidth: 'fit-content'` y `minWidth: '125px'` en el selector, quedando siempre prolijo y horizontal.

## Sesión: 2 de Octubre de 2026 - Solución al Error 500 en Autogestión, Autor en Reprogramación/Cancelación, Cumpleaños Día/Mes, Frecuencia en Semanas y Pago Predeterminado en Transferencia

### Problemas y Requerimientos Resueltos:
1. **Fix Crítico al Error 500 en Autogestión (`media_1790945957810.png`)**:
   - Síntoma: Al confirmar una reprogramación en la web de autogestión, aparecía el cartel rojo `⚠️ Error interno del servidor`.
   - Causa Raíz: En `prisma.turno.update` y en `/api/admin/autogestion-alertas` se utilizaba el campo `updatedAt`, pero el modelo `Turno` en `prisma/schema.prisma` y la tabla PostgreSQL carecían de esta columna, arrojando `PrismaClientValidationError: Unknown argument updatedAt`.
   - Solución: Se agregó `updatedAt DateTime @default(now()) @updatedAt` a `Turno` en `schema.prisma` y se ejecutó la migración SQL en PostgreSQL en producción. Se recompilaron los bindings con `npx prisma generate` y se probó la API respondiendo 200 OK.
2. **Etiqueta de Reprogramación con Autor (`media_1790945922414.png`)**:
   - Por panel admin: `[Turno reprogramado de DD/MM/YYYY a las HH:MM hs - Administrador]`.
   - Por autogestión: `[Turno reprogramado de DD/MM/YYYY a las HH:MM hs - Autogestión]`.
3. **Etiqueta de Cancelación con Autor y Seña**:
   - Administrador (seña conservada): `[Seña a favor: $XX.XXX (Guardada por cancelación DD/MM/YYYY) - Administrador]`.
   - Administrador (seña retenida): `[Pierde seña: $XX.XXX (Cancelación con menos de 72hs) - Administrador]`.
   - Autogestión: `[Pierde seña: $XX.XXX - Autogestión]`.
4. **Fecha de Cumpleaños Solo Día y Mes (Sin Año)**:
   - Reemplazado el `<input type="date">` por dos selectores nativos (`Día` 1 a 31 y `Mes` Ene a Dic) más botón limpiar `✕`. Almacena año neutro `2000` en la BD para evitar deslizamiento de años en el teclado móvil, y formatea `DD/MM` en fichas y exportaciones.
5. **Comentario de Frecuencia con Sufijo "Semanas"**:
   - Actualizado el comentario automático para indicar: `[Frecuencia de turno cambiada de X a Y semanas]`.
6. **Método de Pago Predeterminado en TRANSFERENCIA**:
   - Modelo `Turno` configurado con `@default("TRANSFERENCIA")`. El selector de la tarjeta clínica y la creación de turnos toman por defecto `TRANSFERENCIA`.

### Estado de Despliegue:
- Compilación exitosa con Next.js Turbopack (41/41 rutas, 0 errores).
- Cambios commiteados y empujados a `main` y `staging` en GitHub (`254487d`).
- Desplegado y verificado en Producción (puerto 3006) y Staging (puerto 3008) en el VPS Hostinger.

## Sesión: 2 de Octubre de 2026 - Módulos Prioritarios (Bloqueo, Reseñas, Matriz de Notificaciones) y Corrección de Alertas Emergentes de Autogestión

### Requerimientos Implementados:
1. **Módulo 1: Bloqueo de Clientes**:
   - Botón interactivo de bloqueo/desbloqueo en Ficha del Cliente, badge `🚫 (Bloqueado)`.
   - En el portal público de autogestión, el cliente bloqueado no visualiza citas activas y su calendario aparece completamente en rojo (`dayCellFull`) no clickeable, con el cartel obligatorio: *"No hay turnos disponibles proximamente, volverse a contactar mas adelante para consultar disponibilidad de fechas"* y botón 'Salir'.
2. **Módulo 2: Reseñas de Google**:
   - Checkbox `recibioResena` en la tabla de clientes y en el modal de turno de la agenda. Filtros `con_resena` y `sin_resena`.
   - Sincronización reactiva con el botón `⭐ Mandar Reseña`: se oculta automáticamente al marcarlo o enviar el aviso, y reaparece si se desmarca.
3. **Módulo 3: Matriz Granular de Notificaciones & Plantilla "Va a Avisar"**:
   - Selector maestro y checkboxes por canal (WhatsApp, Correo) y por evento (Alta, Cancelación, Reprogramación, Mantenimiento) en la Ficha del Cliente (`canSendNotification`).
   - Plantillas de WhatsApp y Correo para "Va a Avisar" integradas en `/admin/configuracion`.
4. **Fix de Alertas Emergentes de Autogestión en Agenda (`media_1790953830917.png`, `media_1790953845208.png`)**:
   - **Persistencia en LocalStorage**: Se resolvió la reaparición continua de popups al abrir o recargar la agenda guardando los IDs de alertas descartadas en `localStorage` (`dismissed_autogestion_alerts`) al presionar "Entendido", "✕" o "Ver Turno ↗".
   - **Filtro Estricto de Autogestión**: Se eliminaron los selectores genéricos `{ estado: 'CANCELADO' }` y `{ estado: 'REPROGRAMADO' }` en `/api/admin/autogestion-alertas`. Ahora solo filtra turnos con tags de autogestión (`[CANCELADO_AUTOGESTION]`, `[REPROGRAMADO_AUTOGESTION]`, `- Autogestión]`), excluye explícitamente cambios de administradores (`NOT: { observaciones: { contains: 'Administrador' } }`) y descarta citas pasadas anteriores a 48hs (erradicando alertas históricas de agosto).
   - **Formato de Fecha DD/MM/YYYY**: Se formatea la fecha como `dia/mes/año` (`DD/MM/YYYY`, ej: `14/10/2026`) tanto en el backend como en el frontend con el helper `formatAlertDate`.

### Estado de Despliegue:
- Compilación local Next.js limpia (`npm run build`, 41/41 rutas).
- Cambios empujados a la rama `staging` en GitHub (`8e52e10`).
- Desplegado y verificado en Staging VPS (`http://187.127.9.216:3008`, PM2 `gonzalo-agenda-staging`).
- Verificación automatizada con Puppeteer en Staging: fecha visualizada como `29/12/2026`, botón "Entendido" descarta el cartel, y al recargar la página la alerta ya NO vuelve a aparecer.
- Producción (`https://agenda.depilacionparahombres.com`, puerto 3006) 100% aislada e intacta (HTTP 200 OK).



