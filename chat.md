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

## Sesión: 2 de Octubre de 2026 - Corrección de Encogimiento y Desborde/Scrolls en Modal de Cliente (ABM Clientes Móvil)

### Problema Reportado:
- Reporte del usuario con 4 capturas (`media_1790956635053.png` a `media_1790956682611.png`): *"Arregla este error por el cual esto en vez de adaptarse se hace pequeño y añade scrolls laterales y horizontales"*.
- En dispositivos móviles (iPhone 390px, Android 360px), el modal de la Ficha del Cliente (`⚙️ ABM Clientes`) sufría encogimiento y desborde lateral.

### Soluciones Implementadas:
1. **Eliminación de Paddings Anidados y Ancho al 100%**:
   - Se definió `.profileModalContent` con `width: calc(100vw - 0.5rem) !important; padding: 0 !important;` y `.cardSection` con `width: 100% !important; box-sizing: border-box !important;`.
   - Las tarjetas blancas pasaron de 280px a 340px útiles en iPhone de 390px (94% del ancho de pantalla).
2. **Scroll Vertical Único y 0px de Scroll Horizontal**:
   - `.profileModalContent` con `overflow: hidden !important; padding: 0 !important;`.
   - `.modalBody` configurado como único scroll container: `overflow-y: auto !important; overflow-x: hidden !important; touch-action: pan-y !important; overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch !important;`.
3. **Blindaje de Inputs de Fecha, Textareas y Selects**:
   - Agregado a `.inputGroup` y sus campos: `width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important;`.
   - Para `<input type="date">`: `display: block; -webkit-appearance: none;` impidiendo desbordes en WebKit iOS/Android.
4. **Grillas Responsivas a 1 Columna en Pantallas Móviles (<= 600px)**:
   - Creadas clases `.quickActionsGrid`, `.notifTypesGrid` y `.clinicalSessionsGrid` con `grid-template-columns: 1fr !important` en móvil.
5. **Alineación de Checkboxes y Canales**:
   - En `globals.css`: refinado `input:not([type="checkbox"]):not([type="radio"])` y agregada regla específica para casillas (`width: auto !important; accent-color: var(--color-gold)`).
   - En el formulario: implementado `.checkboxRow` con `white-space: nowrap` para canales (`💬 WhatsApp`, `📧 Email`).

## Sesión: 2 de Octubre de 2026 - Despliegue a Producción (Main): Espacio Libre de Dos Renglones en Vista Diaria Neocita

### Requerimiento de Gonzalo Siri:
- Captura de pantalla de WhatsApp (`media_1790959948860.png`): *"Podes hacer que el espacio que dejas para un turno libre sea de dos renglones en lugar de 1 como se ve aca, asi esta mas legible y destacado"*.
- El usuario solicitó el despliegue directo a la rama `main` y producción.

### Solución Implementada:
1. **Tarjeta de Dos Renglones (`.neocitaFreeSlot`)**:
   - Altura incrementada de ~32px a **76px** (más del doble de área táctil para interactuar con el pulgar en celulares).
   - Fondo verde suave `#f0fdf4`, borde punteado verde `#86efac`, borde izquierdo grueso de **6px sólido verde `#16a34a`** a juego con el diseño de las tarjetas de turnos de la vista diaria, y sombra sutil.
2. **Renglón 1 (Horario y Duración Destacada)**:
   - Izquierda: `🟢 Libre: {startTimeStr} a {endTimeStr} hs` en tipografía grande (`0.96rem`, peso 800) y verde vivo (`#15803d`).
   - Derecha: Badge de píldora de duración con icono de cronómetro (`⏱️ {durationText}`) sobre fondo verde suave (`#166534`).
3. **Renglón 2 (Subtítulo y Botón de Acción)**:
   - Izquierda: Texto explicativo `Disponible para agendar` (`0.82rem`, color slate `#475569`, peso 600).
   - Derecha: Botón de acción interactivo `+ Agendar` con estilo de píldora en tono vino/oro de la marca con hover animado y feedback táctil.
4. **Preservación Funcional**:
   - Al tocar la tarjeta o el botón se abre el modal "Agendar Nuevo Turno" con la fecha y horas de inicio y fin ya precompletadas.

### Estado de Despliegue y Verificación:
- Compilación local exitosa con Next.js Turbopack (`npm run build`, 41/41 rutas con 0 errores).
- Empujado a la rama `main` en GitHub.
- Desplegado en Producción en el servidor VPS (`agenda.depilacionparahombres.com`, PM2 `gonzalo-agenda`, puerto 3006).
- Verificado estado HTTP 200 OK en producción.

### Corrección Adicional Inmediata: Erradicación de Alertas Emergentes Recurrentes
- **Problema Reportado por Gonzalo Siri (`media_1790963963058.png`)**: *"Además, cada vez que abro la agenda me repite una y otra vez los mismos mensajes emergentes"*. Mostraba popups de turnos pasados de agosto y con fecha en formato `YYYY-MM-DD`.
- **Causas Raíz Resueltas**:
  1. La adición de la columna `updatedAt` con `DEFAULT CURRENT_TIMESTAMP` había asignado la fecha de hoy a cientos de turnos antiguos de agosto/septiembre que tenían tags viejos de reprogramación.
  2. En PostgreSQL (`agenda_db`), se ejecutó `UPDATE "Turno" SET "updatedAt" = "createdAt" WHERE "createdAt" < '2026-10-01'`, restaurando la fecha real para 641 citas históricas y eliminando todas las falsas alarmas antiguas.
  3. Se desplegó en `main` la persistencia de alertas descartadas en `localStorage` (`dismissed_autogestion_alerts`) para que al presionar "Entendido", "✕" o "Ver Turno ↗" nunca vuelvan a emerger.
  4. Formato de fecha corregido a `DD/MM/YYYY`.
- **Verificación Final**: La API `GET /api/admin/autogestion-alertas` en producción devuelve `count: 0`. La pantalla de agenda en móviles queda 100% limpia sin ventanas emergentes intrusivas.

## Sesión: 2 de Octubre de 2026 - Color Diferenciado de Espacio Libre y Fix de Fecha Actual al Abrir Agenda

### Requerimientos de Gonzalo Siri (WhatsApp):
1. *"El turno libre se lee con doble renglón está perfecto. Lo podrías poner al espacio libre con un color diferente para que se note simple vista"* (`media_1790965759459.png`, `media_1790965787650.png`).
2. *"Otro error que tira, ahora es que al abrir la agenda me muestra la fecha 23 de julio, en lugar de la fecha del día de hoy"* (`media_1790965811260.png`).

### Solución Implementada:
1. **Color Contrastante para el Espacio Libre**:
   - Rediseño de `.neocitaFreeSlot` en `src/app/admin/agenda/agenda.module.css` a la paleta cálida ámbar/oro de la marca:
     - Fondo: `#fffbeb` (ámbar crema cálido).
     - Borde punteado: `1.5px dashed #f59e0b`.
     - Borde izquierdo: `6px solid #d97706`.
     - Texto horario: `#b45309` (0.96rem, peso 800) con emoji ámbar `🟡`.
     - Badge duración: `#92400e` con fondo `rgba(245, 158, 11, 0.18)` y borde ámbar.
     - Texto descriptivo: `Disponible para agendar` en `#78350f` (peso 600).
     - Botón `+ Agendar`: Gradiente vino distintivo `linear-gradient(135deg, #7a1e1e 0%, #991b1b 100%)` con texto blanco y sombra.
   - Rompe completamente la monotonía del verde de los turnos señados (`SEÑADO`), haciendo que cualquier horario libre resalte a primera vista.
2. **Apertura Incondicional en HOY (Erradicación del 23 de Julio)**:
   - Diagnóstico forense en los logs de Nginx reveló que el acceso directo guardado en la pantalla de inicio del iPhone de Gonzalo apuntaba a `/admin/agenda?date=2026-07-23&view=week` desde las pruebas de julio.
   - En `src/app/admin/agenda/page.js`: se valida si `dateParam` es estrictamente anterior a hoy (`parsedStart < startOfToday`) sin un contexto activo (`turnoId`, `reprogramarTurnoId`, `newTurno`, `fromClient`, `fromStats`). En tal caso, se descarta incondicionalmente, fijando `initialDate = new Date()` (HOY en GMT-3) e `initialView = 'day'` en celulares, y limpiando la URL con `window.history.replaceState`.
3. **Compilación y Validación**:
   - `npm run build` ejecutado exitosamente con Next.js Turbopack (41/41 páginas con 0 errores).
   - Decisión `D-95` y Error `ERR-37` registrados en `.synapse/`.





## Sesión: 5 de Octubre de 2026 - Restauración y Unificación de Comentarios de Cancelación (`[Cancelado - ...]`) (Luciano Gómez)

### Requerimiento:
- *"Y en los comentarios del turno del día, nosé si se perdió en alguna actualizacion pero al cancelar el turno, ya no dice si se retuvo la seña o si se guardo. Antes decía [Cancelado - Seña de $... Guardada para siguiente turno]. Ahora debería tener esa info (más lo que ya sumaste de que si se hizo por autogestion o por administración)"*.

### Implementación y Despliegue:
1. En `src/app/api/admin/turnos/[id]/route.js`:
   - Seña guardada: `[Cancelado - Seña de $... Guardada para siguiente turno - Administrador]`
   - Seña retenida: `[Cancelado - Pierde seña de $... - Administrador]`
   - Sin seña: `[Cancelado - Administrador]`
2. En `src/app/api/reservas/cancelar/route.js`:
   - Con seña: `[Cancelado - Pierde seña de $... - Autogestión]`
   - Si conserva seña: `[Cancelado - Seña de $... Guardada para siguiente turno - Autogestión]`
   - Sin seña: `[Cancelado - Autogestión]`
3. Compilado con Next.js Turbopack (`npm run build`, 41/41 páginas con 0 errores).
4. Desplegado y verificado en VPS (`187.127.9.216`, puerto 3006), PM2 `gonzalo-agenda` recargado y respondiendo HTTP 200 OK. Commit `65a6120` pusheado a GitHub.

## Sesión: 5 de Octubre de 2026 (Seguimiento) - Fusión Staging a Main y Resolución de 6 Puntos de Feedback (Luciano Gómez y Gonzalo Siri)

### Requerimiento del Usuario:
1. "Despliega ese cambio en el main" (Fusión y despliegue integral de Staging a Producción/Main).
2. "Analiza bien las imágenes que te dejo para saber el contexto" (9 capturas de WhatsApp con feedback del 2 y 5 de octubre).

### Puntos Implementados:
1. **Filtro Unificado de Clientes (`/admin/clientes`)**:
   - Reemplazo de los 3 selectores aislados por un único `<select>` estructurado con `<optgroup>` ("Tipo de Cliente", "Notificaciones WhatsApp / Email", "Reseñas de Google").
2. **Bloqueo de Navegación de Mes para Clientes Bloqueados**:
   - Ocultamiento de flechas `←` y `→` cuando `isClientBlocked === true` en autogestión, impidiendo que el cliente navegue a meses futuros donde vería días en gris.
3. **Tope de Reserva Online de 1 Mes y Medio (45 días)**:
   - Configurado en `src/app/page.js` y `src/app/api/disponibilidad/route.js`. Días posteriores a 45 días se marcan no disponibles/cerrados (`LIMITE_ANTICIPACION`) y no se permite avanzar a meses posteriores.
4. **Fix Bug de Año en Calendario (`handleNextMonth`)**:
   - Corregido `setCalendarYear(prev => prev + 1)` (estaba restando 1 año al pasar de diciembre a enero).
5. **Persistencia de Seña y Bonificación al Editar Turno**:
   - Inyección en `PUT /api/admin/turnos/[id]` de `valorTotal`, `valorSeña`, `bonificacion`, `descuentoTipo`, `descuentoValor` en `updateData`.
   - En `src/app/admin/agenda/page.js`, actualización en caliente de `selectedTurno` al confirmar la edición.
6. **Optimización de Despacho de WhatsApp Manual**:
   - Normalización con `normalizeWhatsApp` en el payload de relay (`http://localhost:3007/api/whatsapp/send`).
   - Timeout de 4s en `getNumberId` para evitar congelamiento de Puppeteer.
   - Diagnóstico claro de errores que distingue entre desconexión del servicio vs timeout de entrega al destinatario.

### Validación:
- `npm run build` ejecutado exitosamente (41/41 rutas válidas, 0 errores en 108s).
- Decisiones `D-97`, `D-98` y Errores `ERR-39`, `ERR-40`, `ERR-41` documentados en `.synapse/`.

## Sesión: 5 de Octubre de 2026 (Seguimiento 2) - Enlace de Instagram y Botón "← Volver a la web"

### Requerimiento del Usuario:
- Modificar el enlace de Instagram en el pie para que dirija a `https://www.instagram.com/depilacionparahombres/`.
- Agregar arriba el botón visible `← Volver a la web` apuntando a `https://depilacionparahombres.com/`.

### Implementación:
1. En `src/app/page.js`:
   - Enlace de Instagram en el pie de página actualizado a `https://www.instagram.com/depilacionparahombres/`.
   - Incorporado botón `.btnVolverWeb` con el texto "← Volver a la web" apuntando a `https://depilacionparahombres.com/` en la cabecera superior.
2. En `src/app/page.module.css`:
   - Creada clase `.btnVolverWeb` con colores de marca (`#7a1f1e`, fondo suave `#fef2f2`, borde `#fecaca`, sombra y hover reactivo).
   - Ajustada `.headerContent` con `flex-wrap: wrap` y media queries para adaptación ergonómica en móviles de 360-390px.
3. Decisión `D-99` registrada en `.synapse/decisions.md`.

## Sesión: 5 de Octubre de 2026 (Seguimiento 3) - Blindaje Definitivo de Modal de Turnos en Móviles (Fix Recorte Lateral en iPhone)

### Requerimiento / Diagnóstico del Usuario:
- Gonzalo Siri envió captura (`media_1791240587728.png`) con el mensaje *"Veo la pantalla cortada"*.
- Diagnóstico: en iPhone (WebKit iOS), el modal de detalle del turno (`/admin/agenda`) aparecía desplazado/cortado por el lateral derecho, truncando el saldo pendiente (`$57.000` se leía `$5`), método de pago, botones de reenvío de WhatsApp y Email, fecha de 1° turno, sesiones y cumpleaños.
- Causa raíz:
  1. Ausencia del objeto de exportación `viewport` en `src/app/layout.js`, provocando auto-zoom agresivo de iOS (~1.25x) al interactuar con inputs o selectores clínicos (< 16px).
  2. `width: calc(100vw - 0.7rem)` en `.modalContent` que desbordaba la pantalla en iOS.
  3. `min-width: fit-content` en `.detailRowBetween .detailLabel` impidiendo quiebre de texto en filas financieras.
  4. Falta de envoltura flexible y corte defensivo en filas de contacto (WhatsApp / Email).

### Implementación Realizada:
1. En `src/app/layout.js`:
   - Exportado objeto `viewport` con `width: 'device-width'`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`, `viewportFit: 'cover'`.
2. En `src/app/admin/agenda/agenda.module.css`:
   - En `@media (max-width: 600px)`:
     - `.modalOverlay`: `width: 100% !important; height: 100% !important; height: 100dvh !important; max-width: 100vw !important; max-height: 100dvh !important; padding: max(0.4rem, env(safe-area-inset-top, 0px)) 0.35rem max(0.4rem, env(safe-area-inset-bottom, 0px)) 0.35rem !important; display: flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; overflow: hidden !important; touch-action: none !important; z-index: 2000 !important;`.
     - `.modalContent`: `padding: 0.85rem 0.75rem 3.5rem 0.75rem !important; width: 100% !important; max-width: calc(100vw - 0.7rem) !important; min-width: 0 !important; box-sizing: border-box !important; overflow-x: hidden !important;`.
     - `.stickyModalHeader`: `margin: -0.85rem -0.75rem 0.85rem -0.75rem !important; padding: 0.75rem 0.75rem 0.65rem 0.75rem !important; width: auto !important; box-sizing: border-box !important;`.
     - `.detailGrid`: `display: grid !important; grid-template-columns: 1fr !important; gap: 0.9rem !important; width: 100% !important; min-width: 0 !important;`.
     - `.detailRowBetween`: `padding: 0.4rem 0 !important; gap: 0.4rem !important; width: 100% !important; min-width: 0 !important; box-sizing: border-box !important;`.
     - `.detailRowBetween .detailLabel`: `min-width: 0 !important; flex: 1 1 auto !important; word-break: break-word !important;`.
     - `.detailRowBetween .detailValue`: `max-width: 50% !important; text-align: right !important; white-space: nowrap !important; min-width: 0 !important;`.
3. En `src/app/admin/agenda/page.js`:
   - Fila `Saldo Pendiente en Local`: `min-width: 0`, `wordBreak: 'break-word'`.
   - Fila `Método de Pago`: selector con `maxWidth: 140px`, `fontSize: 13px`, etiqueta flexible.
   - Fila `WhatsApp` y `Email`: contenedor flexible con `flex-wrap: wrap`, email con `wordBreak: 'break-all'`, botones de reenvío con `flexShrink: 0`.
   - Tarjeta clínica: contenedor con `overflow: 'hidden'`, input date a `120px` (`fontSize: 14px`), sesiones a `60px` (`fontSize: 14px`), cumpleaños Día/Mes con selects nativos compactos a `48px` y `54px` (`fontSize: 13px`).
   - Frecuencia estimada: label con `wordBreak: 'break-word'`, container con `flexWrap: 'wrap'`.
4. Compilación con Next.js Turbopack (`npm run build`): 41/41 rutas con 0 errores en 57s.
5. Decisiones `D-100` y Errores `ERR-42` registrados en `.synapse/decisions.md` y `.synapse/errores.md`.

## Sesión: 6 de Octubre de 2026 - Actualización de Enlace Oficial de Google Maps en Autogestión

### Requerimiento del Usuario:
- Mensaje y captura de WhatsApp (`media_1791287435273.png`): Gonzalo/Luciano indica *"Me parece que no lo dirije correctamente"* y comparte el enlace acortado exacto: `https://maps.app.goo.gl/9XurMQfdnv1NMP6H6?g_st=iwb`.
- Solicitud: *"Cambia la url de google maps por esta que es la real https://maps.app.goo.gl/9XurMQfdnv1NMP6H6?g_st=iwb"*.

### Implementación Realizada:
1. En `src/app/page.js`:
   - Enlace de Google Maps en el pie de página de autogestión actualizado de la búsqueda genérica `https://maps.google.com/?q=Parana+597+Buenos+Aires` a la URL directa y canónica oficial de la ficha comercial: `https://maps.app.goo.gl/9XurMQfdnv1NMP6H6?g_st=iwb`.
   - Mantenimiento intacto de atributos de seguridad y apertura en pestaña nueva (`target="_blank" rel="noopener noreferrer"`).
2. Validación técnica:
   - Compilación exitosa en local con Turbopack (`npm run build`, 41/41 rutas con 0 errores).
3. Memoria persistente:
   - Decisión `D-101` documentada y fijada con estado `🔒 LOCKED` en `.synapse/decisions.md`.
4. Despliegue:
   - Empujado a ramas `main` y `staging`.
   - Despliegue automatizado en VPS Hostinger (`187.127.9.216`) para Producción (puerto 3006) y Staging (puerto 3008).

## Sesión: 6 de Octubre de 2026 - Corrección del Enlace Oficial de Reseña de Google Maps en Agenda

### Requerimiento del Usuario:
- Reporte de Luciano Gómez (`media_1791292895762.png`): *"Y el mensaje de la reseña sigue llevando a un link incorrecto"*.
- El mensaje predeterminado de WhatsApp al hacer clic en "⭐ Mandar Reseña" en el modal de detalle del turno de `/admin/agenda` tenía la URL obsoleta `https://g.page/r/gonzalo-depilacion/review`.

### Implementación Realizada:
1. En `src/app/admin/agenda/page.js`:
   - Reemplazada la URL por el enlace canónico de Google Maps provisto: `https://maps.app.goo.gl/9XurMQfdnv1NMP6H6?g_st=iwb`.
2. Validación y despliegue:
   - Sincronizado y compilado en el servidor VPS con Turbopack tanto en Producción como en Staging.
   - Decisión `D-102` y Error `ERR-43` registrados en `.synapse/`.

## Sesión: 6 de Octubre de 2026 - Erradicación de Letras y Enlaces Azules en Correos Transaccionales (Dorado Ámbar #d4a54d)

### Requerimiento del Usuario:
- Gonzalo Siri envió 3 capturas de correos recibidos en iOS (`media_1791315239420.png`, `media_1791315253717.png`, `media_1791315270876.png`) indicando:
  - *"Puedes sacarle las letras azules y ponerlas con otro color para que haga contraste"*
  - *"En confirmación de retorno, pasa lo mismo. Fíjate que debe estar pasando con todos los mails antes, estaba resuelto con un kolor que se leía"*
  - *"Pero hasta hace una semana atrás lo tomaba perfecto, creo que era un color naranja que ponía. Te busco los mails viejos que ahí tiene que figurar"*

### Implementación Realizada:
1. En `src/lib/email.js`:
   - Incorporado el generador base `buildDarkTemplateEmailHtml` con directivas anti-detección:
     - `<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">`.
     - Reglas CSS globales para `x-apple-data-detectors`, `a[href^="calendar:"]`, `u + #body a` y `#MessageViewBody a` con `color: #d4a54d !important; text-decoration: none !important;`.
   - En `applyEmailTemplatePlaceholders`: `{fecha}`, `{día}` y `{horario}` envueltos en dummy-links `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;">` para impedir que Safari Mail inyecte detectores nativos azules de calendario.
   - En `formatEmailParagraphs`: Detección regex de URLs planas (ej: `https://agenda.depilacionparahombres.com/`) convirtiéndolas a enlaces estilizados con `color: #d4a54d !important; text-decoration: underline !important; font-weight: bold;`.
   - Migración completa de todas las plantillas de correo transaccional (`sendNoShowEmail`, `sendConfirmationEmail`, `sendCancellationEmail`, `sendMaintenanceEmail`, `sendRescheduleEmail`, `sendReminder7DaysEmail`) para utilizar `buildDarkTemplateEmailHtml`.
2. Validación técnica:
   - Compilación con Next.js Turbopack (`npm run build`, 41/41 rutas con 0 errores en 53s).
3. Memoria persistente:
   - Decisión `D-103` registrada en `.synapse/decisions.md` y Error `ERR-44` en `.synapse/errores.md`.

## Sesión: 7 de Octubre de 2026 - Blindaje de Privacidad y Noindex en Subdominios Administrativos (Google Search Console)

### Requerimiento del Usuario:
- "Fede, una cosa más. En Search Console vi que Google rastreó una página del panel de la IA: `https://admin.depilacionparahombres.com/conocimiento`. ¿Podés revisar que todo el subdominio admin. pida usuario y contraseña antes de mostrar cualquier contenido, y que no sea visible para Google? Lo ideal sería un robots.txt que bloquee todo y una etiqueta noindex."

### Diagnóstico de Causa Raíz:
1. En `/srv/ia-gonzadep` (`admin.depilacionparahombres.com`), el archivo `src/middleware.js` auto-asignaba la cookie de sesión `session='admin.authenticated'` a cualquier visitante o bot de rastreo que no tuviera cookie previa.
2. Como resultado, cualquier usuario o crawler (incluyendo Googlebot) que visitara `https://admin.depilacionparahombres.com/conocimiento` o cualquier otra página del panel recibía acceso directo con renderizado de contenido completo (HTTP 200).
3. No existía archivo `robots.txt` ni directivas `noindex` en los metadatos o cabeceras HTTP de Nginx.

### Implementación Realizada:
1. **Subdominio Admin IA (`admin.depilacionparahombres.com` / `/srv/ia-gonzadep`)**:
   - **Eliminación de auto-asignación de sesión**: Se reescribió `src/middleware.js` implementando verificación criptográfica nativa HMAC-SHA256 con Web Crypto (`crypto.subtle`).
   - **Autenticación obligatoria**: Cualquier intento de acceso sin cookie válida a páginas privadas (como `/conocimiento`, `/`, `/chats`, etc.) es redirigido de inmediato con HTTP 307 a `/login` sin renderizar ni fugar contenido. Las llamadas a APIs privadas retornan HTTP 401 Unauthorized.
   - **Excepciones controladas**: Únicamente se permiten activos estáticos, `/robots.txt`, endpoints de autenticación (`/login`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`) y llamadas internas de relay desde localhost para el servicio de WhatsApp.
   - **Robots.txt & Noindex**:
     - Creado `public/robots.txt` con `User-agent: * \n Disallow: /`.
     - Inyectadas directivas `metadata.robots` y etiquetas `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />` y `<meta name="googlebot" ...>` en `src/app/layout.js`.
     - En Nginx (`/etc/nginx/sites-available/ia-gonzadep`), agregada la cabecera `add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet" always;` y bloque `location = /robots.txt` directo.
2. **Subdominio Agenda (`agenda.depilacionparahombres.com` / `gonzalo-dep`)**:
   - Creado `public/robots.txt` bloqueando el rastreo de `/admin/` y `/api/`.
   - En `src/app/admin/layout.js`, agregado `metadata.robots: { index: false, follow: false, nocache: true }`.
3. **Validación Técnica y Pruebas Reales**:
   - `curl -i https://admin.depilacionparahombres.com/robots.txt` -> HTTP 200 con `Disallow: /` y `X-Robots-Tag`.
   - `curl -i https://admin.depilacionparahombres.com/conocimiento` -> HTTP 307 Temporary Redirect a `/login` con `X-Robots-Tag`.
   - `curl -i https://admin.depilacionparahombres.com/api/conocimiento` -> HTTP 401 Unauthorized.
   - Flujo de login con credenciales válidas verificado: emite cookie y permite acceso 200 OK a `/conocimiento`.
   - Relay interno a `/api/whatsapp/status` verificado respondiendo 200 OK.
   - Compilación con Next.js Turbopack probada en ambos proyectos con 0 errores.
4. **Memoria Persistente**:
   - Registrada Decisión `D-104` en `.synapse/decisions.md`.

## Sesión: 7 de Octubre de 2026 (Seguimiento) - Implementación de 5 Requerimientos Clave (Gonzalo Siri & Luciano Gómez)

### Requerimientos Atendidos:
1. **Bug Checkbox Reseñas en Ficha/Modal de Agenda (`media_1791402558842.png`)**:
   - Síntoma: Al prender el check de reseñas o enviarla por WhatsApp, al salir y volver a entrar volvía a estar apagado.
   - Causa Raíz: En `src/app/admin/agenda/page.js` líneas 4198 y 4572 se llamaba a `setTurnos(...)` en vez de `setAppointments(...)`. El `ReferenceError` abortaba la ejecución antes del `fetch` a `/api/admin/clientes/${id}`, por lo que nunca persistía en PostgreSQL.
   - Solución: Corregido a `setAppointments` en ambos puntos. Verificado que persiste en caliente y en base de datos.
2. **Nueva Fórmula de Duración de Turnos (`media_1791402580565.png`)**:
   - Reemplazada la fórmula anterior por: **Zona más larga + 10 minutos por cada zona adicional, con excepción de Axilas, Hombros y Genitales que suman 0 min adicionales**.
   - En caso de empate en la duración máxima, se prioriza una zona que no sea excepción como base.
   - Testeado exhaustivamente con casos unitarios (Piernas + Axilas = 40 min; Piernas + Espalda = 50 min; Genitales + Glúteos = 20 min; Axilas + Hombros = 10 min).
3. **Selector Método de Pago al Agendar Turno Nuevo o Siguiente (`media_1791402603634.png`)**:
   - En el modal de creación de turno (`newTurno`) se añadió el selector `<select>` para `metodoPago` (Transferencia o Efectivo, predeterminado `TRANSFERENCIA`), conectándolo con el payload de creación hacia el backend.
4. **Mensaje de Seña Previa (Guardada en verde / Perdida en rojo) (`media_1791402603634.png`)**:
   - Al seleccionar o agendar a un cliente cuyo último turno fue cancelado, se muestra bajo el campo de "Seña Recibida ($)" el badge informativo:
     - `✅ Seña guardada de $... para este turno` en verde (si conservó la seña).
     - `⚠️ Seña perdida de $... en cancelación anterior` en rojo (si la seña fue retenida).
   - Backend en `/api/admin/turnos/ultimo-cliente` calcula automáticamente `señaEstado` y monto.
5. **Mejoras en Autogestión (`src/app/page.js` - `media_1791402623099.png`)**:
   - Agregado botón directo estilizado `💬 WhatsApp` hacia `https://wa.me/5491176735678` en la cabecera superior.
   - En el formulario de cliente nuevo (Paso 1), añadido selector de Cumpleaños (Día y Mes) con días del 1 al 31 y meses de Enero a Diciembre, enviándose y guardándose en `/api/reservas/crear`.

### Estado de Compilación:
- Next.js Turbopack (`npm run build`) validado con 41/41 rutas y 0 errores.
- Decisión `D-105` y Error `ERR-45` registrados en `.synapse/`.

## Sesión: 7 de Octubre de 2026 (Seguimiento 2) - Mensaje de Novedades para WhatsApp
- Redacción y entrega del mensaje ejecutivo y operativo listo para enviar a Gonzalo Siri y Luciano Gómez vía WhatsApp.
- Detalle integral de los 6 puntos clave: blindaje de privacidad y Google Search Console (noindex/robots), fix persistencia checkbox reseñas, nueva fórmula de tiempos de turno (zonas con 0 min extra), método de pago al agendar, aviso visual de seña previa (guardada/perdida) y mejoras de autogestión (WhatsApp directo y cumpleaños día/mes).

## Sesión: 8 de Octubre de 2026 - Blindaje Naranja/Dorado (#d4a54d) en Expresiones Temporales ("dentro de 7 días") y Erradicación de Enlaces Azules de Gmail
- Requerimiento de Gonzalo Siri (`media_1791462375107.png`): "¿Podemos pasar esto a naranja también?" (señalando "dentro de 7 días" en azul en un correo de recordatorio recibido por un cliente en Gmail).
- Solución implementada:
  1. Detección automática en `formatEmailParagraphs` de expresiones temporales relativas (`dentro de X días`, `en X días`, etc.) y envoltura en dummy-links inalterables `<a href="#" class="dummy-link" style="color: #d4a54d !important; text-decoration: none !important; pointer-events: none; cursor: default;"><strong style="color: #d4a54d !important; font-weight: bold;">...</strong></a>`, impidiendo que los detectores de fecha de Google Calendar y Apple Mail los linkeen en azul.
  2. Inyección de reglas CSS específicas en `buildDarkTemplateEmailHtml` para Gmail web y móvil (`.a3s a`, `div.a3s a`, `a[href*="calendar.google.com"]`, `a[data-date]`) forzando el color de marca `#d4a54d !important;`.
  3. Consumo del sufijo `hs` opcional en la regex de horarios de `applyEmailTemplatePlaceholders` y `applyEmailTemplatePlaceholdersPlain`, eliminando la duplicación "13:40 a 14:00 hs hs".
  4. Supresión del saludo repetido ("Hola Dean Rinaldi," + "¡Hola Dean Rinaldi!") mediante condición `includeGreeting: !hasGreetingInBody`.
- Validación técnica: Script de renderizado probado y compilación Next.js Turbopack limpia (41/41 rutas con 0 errores).







## Sesión: 8 de Octubre de 2026 (Seguimiento) - Eliminación de 'de la noche anterior', Blindaje Anti-Azul WebKit/iOS y Fix de 'seña5.000'
- Solicitud de Gonzalo Siri (`media_1791480481369.png`): *"En el Mail de confirmacion de turno, le podés sacar este texto que está en azul por favor"* (señalando 'de la noche' en azul en iOS Mail dentro de 'Recordá que tenés que venir afeitado al ras de la noche anterior.'). Además, se detectó el bug `- Seña abonada: seña5.000`.
- Solución implementada:
  1. **Remoción de texto**: Se eliminó 'de la noche anterior.' de todas las plantillas del sistema (`src/lib/email.js`, `src/app/api/admin/configuracion/route.js`, `prisma/seed.js`) y se actualizó directamente en PostgreSQL en VPS (`agenda_db` y `agenda_db_staging`), dejando la redacción concisa y uniforme: "Recordá que tenés que venir afeitado al ras.".
  2. **Blindaje anti-azul WebKit/Apple Mail**: En `formatEmailParagraphs`, se interceptan expresiones horarias/diarias ('de la noche', 'de la tarde', 'a la mañana', 'la noche anterior') y se blindan con dummy-links inertes (`color: inherit !important;`) para que Apple Mail nunca más las convierta en enlaces azules.
  3. **Solución del bug de seña ('seña5.000' -> '$25.000')**: Se erradicó el trap de JavaScript en `.replace()` donde `$25.000` reemplazaba `$2` por el capture group 2 (`seña`). Se implementaron funciones replacer `() => ...` para `seña`, `saldo` y `total`, garantizando formato numérico impecable.
- Compilación y Despliegue:
  - Compilación local Next.js Turbopack: 41/41 rutas con 0 errores.
  - Commits y push a ramas `main` y `staging` (`4980bdd`).
  - Despliegue en VPS en Producción (puerto 3006) y Staging (puerto 3008) vía `scratch/deploy_both.mjs` con verificación HTTP 200 OK en ambos.
  - Registrado en `.synapse/decisions.md` (D-107) y `.synapse/errores.md` (ERR-47).

## Sesión: 11 de Octubre de 2026 - Consulta de Estado de Módulos (Gonzalo Siri)
- Consulta recibida (`media_1791758859681_bb1b8c19.png`): *"Hola Fede como estas? En que módulo de desarrollo de la agenda estas?"*.
- Auditoría contra el documento oficial `Mejoras AppWeb.docx`:
  1. **Completados al 100% (5)**: Alta Rápida de Turno, Agenda Neocita con huecos/bloqueos, Ficha de Clientes con recibos/historial, Estadísticas avanzadas con caja, y Autogestión Online.
  2. **En curso / Parcial (1)**: Notificaciones (cron, recordatorios 48h, correos transaccionales y matriz granular listos; ajustes de plantillas y cumpleaños).
  3. **Pendientes (4)**: Gastos (siguiente a implementar), Configuración Avanzada, Roles/Niveles de acceso, y Multioperador/Agendas paralelas (para el final).
- Se redactó respuesta clara, ejecutiva y amigable para WhatsApp.

## Sesión: 13 de Octubre de 2026 - Detección y Advertencia de Teléfono Duplicado en Autogestión (Gonzalo Siri)
- Requerimiento de Gonzalo Siri (`media_1791896380468_64cc4b4c.png`):
  *"un cliente al entrar por autogestion, uso un mail distinto al que nos había dado (ya sea porque lo cambio o lo que sea)... es posible que en ese caso, si un cliente pone un número de teléfono idéntico a uno que ya hay en el sistema le dé un aviso de que ese teléfono ya está cargado con otro mail, y que se contacte con nosotros"*.
- Implementación realizada:
  1. **Detección en consulta de cliente (`/api/clientes/consultar`)**: Parámetros `whatsapp` y `currentEmail`. Búsqueda exhaustiva y normalizada en PostgreSQL. Si el teléfono ya existe pero con un mail diferente, devuelve `{ phoneRegisteredUnderOtherEmail: true, registeredEmailMasked: 'g****o@hotmail.com' }` protegiendo la privacidad del cliente original.
  2. **Alerta visual y bloqueo en Autogestión (`src/app/page.js`)**: Al presionar "Continuar a Selección de Zonas" en el Paso 1 de alta, se consulta la API en caliente. Si hay conflicto, se detiene la navegación y se despliega una tarjeta de aviso clara con:
     - Notificación de que el número ya está registrado bajo otra cuenta (`g****o@hotmail.com`).
     - Botón verde `💬 Contactar por WhatsApp` a `https://wa.me/5491176735678` con mensaje prearmado: *"Hola! Quise reservar por la web de autogestión pero mi teléfono ya está cargado con otro mail (...). ¿Me ayudan a actualizar mis datos?"*.
     - Botón `← Probar con otro correo` para reiniciar el flujo si el paciente recuerda su mail registrado anterior.
  3. **Blindaje de Backend (`POST /api/reservas/crear`)**: Validación defensiva que rechaza con HTTP 400 y `{ phoneConflict: true }` si se intenta crear un cliente con un teléfono existente bajo otro mail, impidiendo duplicación y fragmentación de historiales en la base de datos.
- Despliegue y Pruebas:
  - Compilación local Turbopack exitosa (41/41 rutas, 0 errores).
  - Push a `main` y `staging` en GitHub (`03d3f1f`).
  - Desplegado y verificado en VPS en Producción (puerto 3006) y Staging (puerto 3008).
  - Consulta de prueba ejecutada contra la API pública de producción devolviendo respuesta esperada (código 200 con `phoneRegisteredUnderOtherEmail: true`).
  - Decisión `D-108` registrada en `.synapse/decisions.md`.

## Sesión: 13 de Octubre de 2026 (Seguimiento) - Actualización de Botón de WhatsApp al Número Oficial de Gonzalo
- Requerimiento del Usuario: *"El boton de whatsapp de la agenda tiene que ir al de gonzalo +54 9 11 3251-9008"*.
- Modificaciones realizadas:
  1. En `src/app/page.js`:
     - Botón de cabecera `💬 WhatsApp` actualizado a `https://wa.me/5491132519008`.
     - Botón de contacto en la alerta por conflicto de teléfono duplicado actualizado a `https://wa.me/5491132519008`.
  2. En `src/app/booking/failure/page.js`:
     - Botón `💬 Contactar Soporte` actualizado del placeholder genérico a `https://wa.me/5491132519008`.
- Validación y Despliegue:
  - Compilación local Turbopack exitosa (41/41 rutas, 0 errores en 28s).
  - Push a `main` y `staging` en GitHub (`95f130e`).
  - Desplegado en VPS Hostinger en Producción (`gonzalo-agenda`, puerto 3006) y Staging (`gonzalo-agenda-staging`, puerto 3008). Ambos servicios online en PM2.
  - Decisión `D-109` registrada en `.synapse/decisions.md`.

## Sesión: 13 de Octubre de 2026 (Seguimiento) - Implementación en Staging de Módulos Pendientes: Gastos, Promociones, Cupones y Cumpleaños
- Requerimiento del Usuario: *"Hace los que siguen en el staging"* (avanzar con los siguientes módulos de `Mejoras AppWeb.docx` en el entorno Staging).
- Módulos Implementados y Desplegados:
  1. **Módulo de Gastos (`/admin/gastos`)**:
     - Modelos Prisma `CategoriaGasto` y `Gasto`.
     - APIs `/api/admin/gastos/categorias` (CRUD con auto-seed de 7 categorías por defecto), `/api/admin/gastos` (cálculo de egresos mensuales, comparación vs mes anterior, desglose por categoría, balance entradas vs salidas según regla Gonzalo y desglose día a día) y `/api/admin/gastos/[id]`.
     - Vista `/admin/gastos` con 4 KPI cards, barra de distribución porcentual, historial de gastos filtrable, balance detallado día a día y modal de administración de categorías con selector de color.
     - Ítem "Gastos" con icono de dólar añadido en `src/app/admin/SidebarNav.js`.
  2. **Promociones y Cupones (`/admin/configuracion` > Promos)**:
     - Modelos Prisma `Promocion` y `Cupon`.
     - APIs CRUD `/api/admin/promociones`, `/api/admin/cupones` y `/api/cupones/validar`.
     - Pestaña "🎁 Promociones y Cupones" en `/admin/configuracion` con ABM completo, switches de activación y selector de zonas para combos.
     - Integración en `/admin/agenda`: sugerencia automática en modal de turno al coincidir zonas seleccionadas con un combo activo ("Aplicar Promo") y validador de cupones alfanuméricos.
  3. **Automatización de Cumpleaños**:
     - Plantillas editables de felicitación de cumpleaños por WhatsApp y Correo en `/admin/configuracion`.
     - Cron diario a las 10:00 AM en `src/lib/whatsapp.js` que detecta clientes activos con cumpleaños hoy, valida idempotencia anual e interactúa enviando el mensaje personalizado.
- Validación y Despliegue:
  - Compilación local Next.js Turbopack exitosa (compilado en 36.7s con 0 errores).
  - Push a rama `staging` en GitHub (`5d284f6`).
  - Despliegue completado con éxito en VPS Staging (`/srv/gonzalo-dep-staging`, puerto 3008, base de datos `agenda_db_staging`).
  - Servicios verificados con requests directos: `/api/zonas` (200 OK), `/api/cupones/validar` (200 OK), `/admin/gastos` (200 OK).
  - Registrado en `.synapse/decisions.md` (D-110) y `.synapse/workcycle.md`.

## Sesión: 13 de Octubre de 2026 (Seguimiento 2) - Gestión de Usuarios, Operadores y Roles de Acceso en Configuración (Staging)
- Requerimiento del Usuario / Gonzalo Siri (`media_1791933437978_661895ea.png`):
  *"Dale lo reviso, está entonces la parte de alta de usuarios y puedo crear en el módulo de pruebas? Para probar crear un operador... No veo la parte de alta de perfiles en configuración"*.
- Módulo Implementado y Desplegado en Staging:
  1. **Modelo de Usuarios y Roles (`Usuario`)**:
     - Extendido en `prisma/schema.prisma` con campos opcionales `email String?`, `telefono String?` y roles soportados: `ADMIN`, `OPERADOR`, `RECEPCION`.
  2. **APIs Administrativas (`/api/admin/usuarios`)**:
     - `GET /api/admin/usuarios`: lista segura de usuarios (excluyendo contraseñas) con verificación de rol `ADMIN`.
     - `POST /api/admin/usuarios`: creación con hash SHA-256 de contraseña, validación de username único y asignación de rol.
     - `PUT /api/admin/usuarios/[id]`: edición de datos, cambio de rol y reseteo opcional de contraseña.
     - `DELETE /api/admin/usuarios/[id]`: baja de usuario con defensas contra auto-borrado y eliminación del último admin.
  3. **Control de Acceso y Visibilidad en Barra Lateral (`SidebarNav.js`)**:
     - Usuario con rol `OPERADOR`: solo visualiza "Alta de Turno", "Agenda de Turnos" y "Clientes" (ocultando Gastos, Estadísticas, Notificaciones y Configuración).
     - Usuario con rol `RECEPCION`: añade "Notificaciones".
     - Usuario con rol `ADMIN`: acceso total sin restricciones.
  4. **Pestaña Interactiva "👥 Usuarios y Operadores" en `/admin/configuracion`**:
     - Botón de pestaña en el menú superior de configuración.
     - Tabla interactiva con columnas: Nombre, Usuario (`@usuario`), Rol con Badges de colores (Administrador en oro, Operador en azul/cyan, Recepción en naranja), Teléfono, Email y botones de Editar y Eliminar.
     - Modal de alta y edición de usuario/operador con selector de rol, usuario y contraseña.
  5. **Compilación y Despliegue en VPS Staging**:
     - Compilación local Next.js Turbopack: 48/48 rutas con 0 errores.
     - Empujado a la rama `staging` en GitHub (`dd050be`).
     - Desplegado en VPS Hostinger (`187.127.9.216`, puerto 3008, PM2 `gonzalo-agenda-staging`, PostgreSQL `agenda_db_staging`).
     - Verificación HTTP 200 OK en `http://187.127.9.216:3008/login`.
     - Registrado en `.synapse/decisions.md` (D-111) y `.synapse/workcycle.md`.

## Sesión: 15 de Octubre de 2026 - Corrección Crítica de Fecha Anterior en Reprogramación de Turnos (Evgenii Morgunov & Sistema General)
- Reporte de Gonzalo Siri y Luciano Gómez (`media_1792068878423_522902e1.png` a `media_1792068895829_78c9f292.png`):
  *"Hola Fede nosé que paso con los turnos que se reprograman, en los comentarios del turno que debería aparecer desde que fecha se reprogramó, no dice ese dato. Sino que dice la fecha a la que se cambió, que no necesitamos, necesitamos la fecha anterior"*.
- Diagnóstico Forense en Base de Datos PostgreSQL VPS:
  1. Turno de Evgenii Morgunov (`b68817ae-825e-491c-a3ab-c8a564d5d749`): creado el 01/09/2026 para el 07/10/2026 a las 15:30 hs. El 05/10/2026 fue reprogramado al 20/10/2026 a las 16:30 hs.
  2. Fallo detectado: en `PUT /api/admin/turnos/[id]`, la condición `if (isDateChanged || isTimeChanged || estado === 'REPROGRAMADO')` evaluaba `estado === 'REPROGRAMADO'` en `true` cada vez que el operador guardaba cualquier cambio posterior (notas del operador, método de pago, asistencia) en una cita que ya estaba reprogramada. En ese momento `oldTurn.fecha` era ya la fecha del turno (`20/10/2026`), inyectando `[Turno reprogramado de 20/10/2026 a las 16:30 hs - Administrador]`.
  3. Adicionalmente, `isTimeChanged` consideraba alteraciones de fin (`horaFin`), y en `alta-turno` se perdían los parámetros `fechaOriginal` y `horaOriginal` en el redirect.
- Solución Implementada:
  1. En `src/app/api/admin/turnos/[id]/route.js`:
     - Eliminada la condición ciega `|| estado === 'REPROGRAMADO'`.
     - Helpers canónicos `toUtcDateStr` y `toDisplayDateStr` para evitar distorsiones de husos horarios.
     - Condición estricta: sólo se genera etiqueta si hay un cambio real de fecha o de hora de inicio (`isDateActuallyChanged || isStartTimeActuallyChanged`) o si `body.isReprogramacion === true`, exigiendo que el destino difiera del origen (`targetFechaIso !== originFechaIso || checkHoraInicio !== originHoraInicio`).
     - Función regex desinfectante que extirpa cualquier etiqueta autorreferencial existente donde la fecha y hora de la etiqueta coincidan con las del propio turno.
  2. En `src/app/admin/alta-turno/page.js` y `src/app/admin/agenda/page.js`:
     - Propagación y persistencia formal de `fechaOriginal`, `horaOriginal` e `isReprogramacion: true`.
  3. En `src/app/api/reservas/reprogramar/route.js`:
     - Validación defensiva contra reagendamiento en el mismo día y horario, y sanitización de etiquetas glitch.
  4. Script SQL ejecutado en PostgreSQL VPS (`agenda_db` y `agenda_db_staging`):
     - Restaurada la fecha original de Evgenii Morgunov (`07/10/2026 a las 15:30 hs`), Joao De Oliveira (`15/10/2026 a las 20:30 hs`) y Gaston Sanchez (`22/09/2026 a las 19:20 hs`).
     - Purgadas las etiquetas autorreferenciales espurias de Horacio Smidt, Daniel Argañaraz, Pedro Laurenz, Alan Gonzalez, Carlos Boscherino, Mauro Castiglioni y Emiliano Sack.
- Validación y Despliegue:
  - Compilación local Next.js Turbopack: 58/58 rutas limpias en 58s.
  - Empujado a ramas `staging` y `main`.
  - Desplegado en VPS en Producción (`gonzalo-agenda`, puerto 3006) y Staging (`gonzalo-agenda-staging`, puerto 3008).
  - Registrado en `.synapse/decisions.md` (D-112), `.synapse/errores.md` (ERR-48) y `.synapse/workcycle.md`.

## Sesión: 15 de Octubre de 2026 - Restricción de Privacidad para Rol OPERADOR, Asignación de Operador por Turno y Selector Dropdown Mobile en Staging
- Solicitud de Luciano Gómez y Gonzalo Siri con 7 capturas anotadas (`media_1792072189582_75f1e764` a `media_1792072328876_d0080a2e`):
  1. *"En estás que tache, el operador desde su cuenta no puede ver nada de esa info"*
  2. *"Además faltó lo del selector de operador para el administrador, osea que puede cambiar el operador de cada turno"*
- Solución y Cambios Implementados:
  1. **Esquema de Base de Datos (`prisma/schema.prisma`)**:
     - Agregada la relación `operadorId String?` y `operador Usuario?` en `model Turno`.
     - Agregado `turnos Turno[]` en `model Usuario`.
     - Sincronizado en SQLite local y PostgreSQL `agenda_db_staging` mediante `npx prisma db push`.
  2. **Restricción de Acceso y Navegación para Operador**:
     - En `SidebarNav.js`, los operadores únicamente ven "Agenda de Turnos" (ocultando "Alta de Turno" y "Clientes").
     - En `/admin/alta-turno`, guarda de sesión que redirige inmediatamente al operador a `/admin/agenda`.
     - En `/admin/clientes`, guarda que redirige a `/admin/agenda` si no viene con `?id=`. En la ficha del cliente se oculta el DNI, se ocultan las pestañas `🔔 Avisos` y `⚙️ ABM Clientes`, y en el historial se ocultan los importes (Costo, Seña, Saldo). Al cerrar la ficha, regresa a `/admin/agenda`.
  3. **Privacidad Financiera y Comercial en `/admin/agenda`**:
     - Encabezado diario: Ocultos los botones "Bloquear Horario", "+ Nuevo Turno" y el importe de "Ingreso Estimado".
     - Huecos libres Neocita y grilla semanal: Clicks deshabilitados y oculto el botón "+ Agendar".
     - Tarjetas Neocita: Muestran el badge `👤 {app.operador.nombre}` y se oculta el desglose financiero.
     - Modal de Detalle de Turno:
       - Oculto el bloque financiero completo (Valor Total, Valor Original, Seña, Saldo, Método de Pago, Descuentos).
       - Ocultos los campos de WhatsApp y Email (junto con sus botones de reenvío).
       - Ocultas las "Observaciones Generales del Cliente" (conservando intactas las "Observaciones del Operador" de potencia/clínica y los "Comentarios de este Turno").
       - Botonera de acciones reducida exclusivamente a: `📁 Ficha Cliente`, `✓ Realizado`, `🏁 Finalizar`, `🛠️ Mantenimiento`, `⏳ Va a Avisar` y `❌ No Asistió`.
  4. **Asignación Dinámica de Operador por Turno para Administrador**:
     - En modal de Detalle de Turno: selector instantáneo `👤 Operador Asignado` con guardado automático contra la API.
     - En modal de Edición de Turno (`isEditing`): selector dropdown para cambiar el operador.
     - En modal de Nuevo Turno (`newTurno`): selector dropdown para asignar el operador inicial.
  5. **Selector Dropdown Mobile en Configuración (`/admin/configuracion`)**:
     - Reemplazo de las pestañas horizontales en pantallas `<= 768px` por un menú `<select>` desplegable responsive estilizado con icono de ajustes (`.tabSelectDropdown`).
  6. **APIs y Sesión**:
     - `GET /api/admin/usuarios`: accesible a staff autenticado para poblar el catálogo de operadores.
     - `GET`, `POST`, `PUT /api/admin/turnos`: incluyen la relación `operador` y persisten `operadorId`.
     - `GET /api/auth/session`: incluye `id` del usuario en sesión.
- Validación y Despliegue:
  - Compilación local Next.js Turbopack: 48/48 rutas con 0 errores.
  - Commit y push a la rama `staging` en GitHub (`42dfe17`).
  - Despliegue exitoso en VPS Hostinger Staging (`/srv/gonzalo-dep-staging` en puerto 3008, PM2 `gonzalo-agenda-staging`).
  - Verificación HTTP 200 OK en `http://187.127.9.216:3008/login`.
  - Registrado en `.synapse/decisions.md` (D-113) y `.synapse/workcycle.md`.

## Sesión: 15-16 de Octubre de 2026 - Privacidad de Impresión, Filtrado Multi-Operador, Operador Gonzalo por Defecto y Perfil Extendido (Staging)
- Requerimientos de Feedback de Luciano Gómez (`media_1792098011650_1e695cb5` a `media_1792098087680_5654a2aa`):
  1. Ocultar importes individuales y total estimado en la vista de impresión del día (`/admin/agenda/imprimir`) para Operadores.
  2. Ocultar botón "📄 Descargar PDF / Imprimir" en la ficha de cliente (`/admin/clientes`) y bloquear acceso para Operadores.
  3. Corregir layout del selector de operador en móvil (evitar colapso vertical de letras) y asignar operador por defecto a "Gonzalo".
  4. Filtrar agenda de operador para que solo visualice sus citas asignadas y no las de Gonzalo u otros operadores.
  5. Extender perfil de operadores en Configuración (`/admin/configuracion`) agregando Cumpleaños, Vacaciones y Modalidad/Valor de Comisión.
- Solución Implementada y Desplegada en Staging (`http://187.127.9.216:3008`):
  1. **Vista de Impresión del Día**:
     - En `src/app/admin/agenda/imprimir/page.js`: para `OPERADOR`, se oculta `Valor: $...` en cada renglón y se sustituye `Total Estimado: $...` por un guión inerte `—`.
     - En `src/app/api/admin/turnos/imprimir/route.js`: se filtran turnos por `whereClause.operadorId = session.id` si el rol es `OPERADOR`.
  2. **Ficha de Clientes e Impresión**:
     - En `src/app/admin/clientes/page.js`: renderizado condicional `{currentUserRole !== 'OPERADOR' && (<button>📄 Descargar PDF / Imprimir</button>)}`.
     - En `src/app/admin/clientes/[id]/imprimir/page.js`: redirección inmediata a `/admin/agenda` si el rol es `OPERADOR`.
  3. **Selector de Operador en Agenda & Predeterminado a Gonzalo**:
     - En `src/app/admin/agenda/page.js`: rediseñado el contenedor con `display: flex; flex-wrap: wrap; gap: 0.6rem;` y `whiteSpace: 'nowrap'`, erradicando el colapso vertical en pantallas móviles.
     - En selectores de creación, edición y detalle: renombrada la opción por defecto a `Gonzalo (Por defecto)`.
     - En `POST /api/admin/turnos`: asignación automática del ID del usuario administrador si no se especifica operador.
     - Script ejecutado en PostgreSQL `agenda_db_staging`: actualizó el nombre del admin a `Gonzalo` y asignó todos los 570 turnos preexistentes a Gonzalo.
  4. **Filtrado Estricto de Agenda Multi-Operador**:
     - En `GET /api/admin/turnos/route.js`: si `session.rol === 'OPERADOR'`, cláusula Prisma `where: { operadorId: session.id }`.
     - En `src/app/admin/agenda/page.js`: filtro defensivo local para asegurar que cada operador solo vea sus propias citas.
  5. **Perfil Extendido en Configuración**:
     - Prisma Schema: agregados `fechaNacimiento`, `vacacionesInicio`, `vacacionesFin`, `comisionTipo` y `comisionValor` al modelo `Usuario`.
     - Backend: soportados en `GET`, `POST` y `PUT` en `/api/admin/usuarios` y `[id]`.
     - UI: tabla de "👥 Usuarios y Operadores" con columnas para Comisión, Cumpleaños/Vacaciones y Contacto; modal con inputs de Fecha de Nacimiento (`type="date"`), Vacaciones Desde/Hasta (`type="date"`), Modalidad de Comisión (`POR_TURNO`, `POR_DIA`, `PORCENTAJE`) y Valor numérico.
- Validación y Despliegue:
  - Compilación local: 48 rutas en 47s con 0 errores (`npm run build`).
  - Commit y push a `staging` (`14e37ab`).
  - Desplegado en VPS Staging (`/srv/gonzalo-dep-staging`, puerto 3008, PM2 `gonzalo-agenda-staging`, DB `agenda_db_staging`).
  - Validación automatizada en vivo con Puppeteer: los 5 puntos verificados con éxito tanto con cuenta Admin (`admin` / `admin123`) como con cuenta Operador (`pedrito` / `pedrito123`).
  - Registrado en `.synapse/decisions.md` (D-114) y `.synapse/workcycle.md`.

## Sesión: 17 de Octubre de 2026 - Resolución de Incidente 502 Bad Gateway y Despacho de Recordatorios de 48hs
- Reporte Urgente de Gonzalo Siri (`media_1792264045157_8c468b36.png` a `media_1792264113799_8050c508.png`):
  *"La página de autogestión está tirando error 502 Bad Gateway, lo podés revisar por favor. Tampoco abre la agenda. Y claro que eso hizo que no salieran los mensajes de 48hs antes"*.
- Diagnóstico Forense en VPS:
  1. El servidor físico/VPS de Hostinger (`187.127.9.216`) se reinició a las ~06:57 AM hora Argentina (~09:57 UTC).
  2. Nginx levantó automáticamente, pero el daemon de PM2 no tenía habilitada la persistencia en `systemd` (`pm2-root.service`). En consecuencia, los procesos `gonzalo-agenda` (puerto 3006), `gonzalo-agenda-staging` (puerto 3008) e `ia-gonzadep` (puerto 3007) quedaron caídos tras el reboot.
  3. Al recibir tráfico en `agenda.depilacionparahombres.com`, Nginx arrojaba `502 Bad Gateway` al no encontrar backend escuchando en 3006.
  4. Por haber estado la aplicación offline durante las 10:00 AM, el cron de recordatorios automáticos de 48hs no se ejecutó, dejando pendientes las notificaciones de los turnos del lunes 19 de octubre.
- Solución y Recuperación:
  1. Se reactivaron los procesos inmediatamente mediante `pm2 resurrect`.
  2. Se configuró y habilitó el servicio systemd mediante `pm2 startup` (`systemctl enable pm2-root`) y se congeló el estado con `pm2 save`.
  3. Se auditó la base de datos de producción (`agenda_db`) y se forzó la ejecución de `checkAndSendReminders(true)`:
     - Se despacharon con éxito los 8 recordatorios de WhatsApp de 48hs correspondientes al lunes 19/10/2026: Alejandro Souto (`5491164229900`), Matias Ramos (`5492657392415`), Javier Picca (`5491130186249`), Pablo Nasillo (`5491123861047`), Lautaro Cocca (`5491140239654`), Gaston Rios (`5491159078777`), David Acosta (`5493516117757`) y Sergio Laguzzi (`5491157745678`).
     - Se procesaron los recordatorios de mantenimiento a 75 días.
  4. Se verificó con `curl` que tanto la landing de autogestión (`/`) como el panel administrativo (`/login`) responden con HTTP 200 OK.
  5. Documentado en `.synapse/errores.md` (`ERR-49`), `.synapse/decisions.md` (`D-115`) y `.synapse/workcycle.md`.

## Sesión: 19 de Octubre de 2026 - Modalidad Comisión Por Hora y Cálculo de Permanencia Diaria en Agenda Administrativa (Staging)
- Requerimiento de Luciano Gómez (`media_1792420123294_5a19bae9.png`, `media_1792420139928_f434d7b0.png`, `media_1792420198289_b7352f13.png`):
  1. Configuración (`/admin/configuracion`): Cambiar la modalidad de comisión de operadores de "Por Día" a "Por Hora Trabajada ($/hora)".
  2. Agenda Administrativa (`/admin/agenda`): Para administradores, calcular la ganancia del operador basándose en el lapso continuo desde el inicio de su primer turno hasta el final de su último turno del día (`max(horaFin) - min(horaInicio)`), multiplicado por `$/hora`. Mostrar `A Pagar Operadores` junto a `Ingreso Estimado` y tarjeta de liquidación en el encabezado diario.
  3. Hoja de Impresión (`/admin/agenda/imprimir`): Incorporar bloque resumen de liquidación de horas de operadores para administradores debajo de totales.
  4. Privacidad: Mantener el rol `OPERADOR` totalmente aislado de importes financieros, totales e ingresos estimados.
- Solución Implementada y Desplegada en Staging (`http://187.127.9.216:3008`):
  1. **Configuración**:
     - Modal de creación/edición de usuario/operador: selector con opción `POR_HORA` ("Por Hora Trabajada ($)"), `POR_TURNO` y `PORCENTAJE`.
     - Label interactivo: `Valor Comisión (ARS $/hora)` y placeholder `Ej: 4000`.
     - Tabla de usuarios: renderiza `$X / hora` para operadores configurados.
  2. **Backend**:
     - Selectores `comisionTipo` y `comisionValor` expuestos en `/api/admin/turnos`, `/api/admin/turnos/[id]` y `/api/admin/turnos/imprimir`.
  3. **Agenda Administrativa (`/admin/agenda`)**:
     - Cálculo en tiempo real de la permanencia del operador agrupando turnos no cancelados: `min(horaInicio)` a `max(horaFin)`.
     - Si modalidad es `POR_HORA`: `(minutosPermanencia / 60) * comisionValor`.
     - Header del día: `Ingreso Estimado` (dorado) + `A Pagar Operadores` (azul).
     - Tarjeta destacada `Liquidación de Operadores (Permanencia del Día)` con desglose detallado por operador: horas totales, primer y último turno, cantidad de turnos, importe a pagar y tarifa horaria.
  4. **Hoja de Impresión (`/admin/agenda/imprimir`)**:
     - Bloque `Liquidación de Operadores (Horas de permanencia del día)` visible para administradores.
  5. **Privacidad del Operador**:
     - Verificado que los operadores no ven importes, totales ni desgloses financieros.
- Validación y Despliegue:
  - Compilación local: 48/48 rutas en 57s (`npm run build`).
  - Commit y push a `staging` (`83e8b91`).
  - Desplegado en VPS Staging (`/srv/gonzalo-dep-staging`, puerto 3008, PM2 `gonzalo-agenda-staging`, DB `agenda_db_staging`).
  - Configurado usuario `pedrito` con tarifa de $5.000/h.
  - Validación automatizada con Puppeteer en vivo:
    - Jueves 15 de Octubre (1 turno de 14:00 a 15:40 = 1h 40m = 100 min) ➔ $8.333 a pagar.
    - Viernes 16 de Octubre (2 turnos de 14:00 a 15:20 = 1h 20m = 80 min) ➔ $6.667 a pagar.
    - Hoja de impresión `/admin/agenda/imprimir?fecha=2026-10-15`: muestra desglose de $8.333 para admin.
    - Login de Pedrito: sin acceso a datos financieros ni totales.
  - Registrado en `.synapse/decisions.md` (D-116) y `.synapse/workcycle.md`.

## Sesión: 19 de Octubre de 2026 (Parte 2) - Despliegue Exitoso a Producción (Main)
- Aprobación del Usuario: *"Subila a produccion"*
- Procedimiento de Despliegue Seguro:
  1. **Backup Preventivo de Base de Datos**: Creado dump completo de `agenda_db` en `/srv/gonzalo-dep/backups/agenda_db_pre_deploy_20261019_161315.sql` (7.3MB).
  2. **Merge de Ramas**: `git checkout main && git merge staging` (`d237003`). Conflictos de documentación unificados con la versión extendida de Staging.
  3. **Verificación de Compilación Local**: `npm run build` completó 48/48 rutas en 35.3s con 0 errores.
  4. **Empujado a GitHub**: `git push origin main`.
  5. **Despliegue Automatizado en VPS Producción (`/srv/gonzalo-dep`, puerto 3006)**:
     - Sincronización git a `origin/main`.
     - Actualización de esquema Prisma con PostgreSQL y `npx prisma db push`.
     - Migración de base de datos: 742 turnos históricos sin operador asignados limpiamente a Gonzalo.
     - Compilación de producción en servidor: 48/48 rutas compiladas en 18.8s.
     - Reinicio limpio de PM2: `pm2 restart gonzalo-agenda` y persistencia con `pm2 save`.
  6. **Validación en Vivo en `https://agenda.depilacionparahombres.com` con Puppeteer**:
     - Landing de autogestión: HTTP 200 OK.
     - Login administrativo: exitoso.
     - Agenda de turnos: cargada con grilla completa y alertas activas de autogestión.
     - Configuración: pestaña "👥 Usuarios y Operadores" activa con Gonzalo como Administrador.
     - Módulo de Gastos: cargado con balance operativo en vivo ($5.706.000) y categorías preconfiguradas.


---

## Sesión 20/10/2026 - Implementación de los 7 Puntos de Luciano Gómez en Producción (`main`)
- **Usuario**: "En la carpeta luciano del escritorio te dejo todas las capturas de las cosas que me pidio luciano y todo el contexto para agregar directamente todo al main, analiza todo, no toques codigo, y cuando me digas que entendiste todo te doy el ok" -> "Te doy el ok"
- **Acciones**:
  1. Redondeo de horas de operadores con umbral de 20 minutos (`>= 20m` suma 1 hora, `< 20m` redondea hacia abajo) en `/admin/agenda` y `/admin/agenda/imprimir`.
  2. Ocultamiento de bloqueos de agenda para el rol `OPERADOR`.
  3. Rediseño limpio y corrección de alto contraste en `/admin/estadisticas`.
  4. Modal ampliado (`🔍 Ampliar Listado en Ventana`) para la lista de turnos/clientes en Estadísticas.
  5. Modal y exportación a Excel (`.xls`) con Modelo A (Ganancias) y Modelo B (Cancelaciones y Seguimiento).
  6. Ajuste de reglas de valor por métrica e incorporación de `💰 Ganancia Neta` en el desplegable de Estadísticas.
  7. Despliegue directo en `main` (`3b994ae`) en el VPS de Producción (`https://agenda.depilacionparahombres.com`).


---

## 📅 Sesión: 20 de Octubre de 2026 - Corrección de Contraste en Gastos y Balance (`/admin/gastos`)
- **Solicitud del usuario**: *"Gastos del mes y mayor categoria no se ve lo que quiere mostrar"* (captura adjunta mostrando texto blanco sobre fondo blanco en `/admin/gastos`).
- **Solución aplicada (`30d001e`)**:
  - En [gastos.module.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/gastos/gastos.module.css) y [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/gastos/page.js):
    - **Gastos del Mes**: valor ahora en rojo intenso (`#dc2626`) de alto contraste y subtítulos en `#475569`.
    - **Mayor Categoría**: valor (`Sin gastos` o nombre de la categoría) ahora en negro (`#1d1d1d`) con alto contraste.
    - **Selector de Mes y Año (`Octubre`, `2026`) y flechas (`←` / `→`)**: antes tenían `color: #fff` sobre fondo blanco; ahora tienen texto `#1d1d1d`, fondo `#f8f6f0` y borde `#cbd5e1`.
    - **Título principal, pestañas, buscador, selector de categorías, modales y tablas de Historial / Balance Día a Día / Categorías**: convertidos de `#fff` a `#1d1d1d` / `#475569` sobre fondos claros.
- **Despliegue**: Subido a `main` y `staging` (`30d001e`) y desplegado en vivo en Producción (`https://agenda.depilacionparahombres.com`).


---

## 📅 Sesión: 20 de Octubre de 2026 - Corrección de Descarga de Excel (`.xlsx` OpenXML Nativo para Celulares y PC)
- **Solicitud del usuario**: *"Me dijo esto luciano, quiso descargar el excel y verlo en el celular"* (captura adjunta mostrando *"No se puede abrir este documento. Aparentemente, la hoja de cálculo está dañada."*).
- **Causa**: El archivo descargado anteriormente era una tabla HTML con extensión `.xls` generada con `Blob` URL, lo cual funciona en Excel de escritorio pero es rechazado como archivo dañado por los visores móviles de Android/iOS (Google Sheets, Excel Mobile, WPS Office).
- **Solución aplicada (`dda0084`)**:
  - Se creó el endpoint [route.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/api/admin/estadisticas/exportar-excel/route.js) (`/api/admin/estadisticas/exportar-excel`) que construye un archivo binario **OpenXML `.xlsx` real** (contenedor ZIP comprimido con `DEFLATE`, `xl/workbook.xml`, `xl/styles.xml`, `xl/sharedStrings.xml`, `xl/worksheets/sheet1.xml`, `docProps/core.xml` y `docProps/app.xml`) con todos los estilos institucionales (encabezado bordó `#6B1D1D`, cabecera azul marino `#1F2D3D`, filas alternadas, bordes, anchos de columna y formato numérico de moneda `"$ "#,##0`).
  - Se actualizó `handleDownloadExcel` en [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/estadisticas/page.js) para realizar una descarga HTTP nativa (`POST` con `Content-Disposition: attachment; filename="Informe_... .xlsx"`), compatible con Android, iPhone y PC.
- **Despliegue**: Subido a `main` y `staging` (`dda0084`) y desplegado en vivo en Producción (`https://agenda.depilacionparahombres.com`).


---

## 📅 Sesión: 20 de Octubre de 2026 - Corrección de Texto Invisible al Seleccionar una Métrica en Estadísticas (`0359c99`)
- **Solicitud del usuario**: Captura de Luciano desde el celular: *"Acá cuando elijo una opción, desaparece el texto"* (en el desplegable `🔎 SELECCIONAR MÉTRICA A ANALIZAR:`).
- **Causa**: `.metricDropdown` en [estadisticas.module.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/estadisticas/estadisticas.module.css) tenía `color: #ffffff` y `background-color: #18181c`, pero al tocar y elegir una opción el `<select>` quedaba en estado `:focus`, y la regla global `select:focus` en [globals.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/globals.css) forzaba `background-color: var(--bg-card)` (`#ffffff`), dejando el texto `#ffffff` invisible sobre fondo `#ffffff` (viéndose únicamente el emoji `❌`).
- **Solución aplicada (`0359c99`)**:
  - En [estadisticas.module.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/estadisticas/estadisticas.module.css): `.metricDropdown`, `.metricDropdown:focus` y `.metricDropdown option` ahora usan fondo blanco (`#ffffff !important`), texto negro (`#1d1d1d !important`) y borde bordó (`#7a1f1e`).
  - En [globals.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/globals.css): se eliminó el `background-color: var(--bg-card)` forzado en `input:focus, select:focus, textarea:focus`.
- **Despliegue**: Subido a `main` y `staging` (`0359c99`) y desplegado en vivo en Producción (`https://agenda.depilacionparahombres.com`).


---

## 📅 Sesión: 20 de Octubre de 2026 - Implementación de 4 Requerimientos de Luciano para la Agenda (`9cf1acc`)
- **Capturas de Luciano**: `media_1792524920683_c575bed6.png`, `media_1792524942046_5aff41f2.png`, `media_1792525073780_e4c098a4.png`:
  1. *"Hola Fede, las duraciones se desconfiguraron y aparecen mal"* (ej. `14:00 - 14:50` mostraba `⏱ 60 min`, `16:00 - 16:30` mostraba `⏱ 40 min`).
  2. *"También si se puede poner el numero de sesión en el recuadro, así sabemos que sesión es"* (flecha roja en la tarjeta diaria hacia la columna izquierda debajo del horario y duración, con el texto `"Sesión 2"`).
  3. *"Y en producción a Gonza le sigue pasando que al entrar a una ficha desde la agenda, al salir de la ficha, lo devuelve arriba de todo del scroll, no conserva el scroll donde estaba al momento de tocar"*.
  4. *"Y el botón de mandar reseñas ahora debe mandar este mensaje y link"*:
     `Hola, si podes me dejas tu calificación o comentario en nuestro perfil de Google 🙏 para que otros usuarios puedan tener una referencia de mi trabajo y atención 📖, ya que con esto me ayudas un montón 😄`
     `El link es el siguiente: https://g.page/r/CZHRtLKRQ2dPEBE/review`
- **Solución implementada**:
  1. **Duraciones reales**:
     - En [route.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/api/admin/turnos/route.js) (`POST`), se corrigió el cálculo de `computedDuration` para usar directamente la diferencia en minutos entre `horaFin` y `horaInicio` (`endMin - startMin`), impidiendo que el bonus de +10 min de nuevo cliente infle la duración de las citas guardadas.
     - En `GET /api/admin/turnos` y en la UI de [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/agenda/page.js), se sanitiza la duración calculando `endMin - startMin`, garantizando que tanto turnos nuevos como citas preexistentes muestren sus minutos exactos (`14:00 - 14:50` ➔ `⏱ 50 min`, `16:00 - 16:30` ➔ `⏱ 30 min`).
  2. **Número de sesión (`Sesión X`) en columna izquierda de tarjeta diaria**:
     - Se creó la función `getTurnoSessionNumber(app)` que calcula la sesión del turno en base a `cliente.sesionesPrevias + turnos realizados cronológicamente previos + 1`.
     - En `.neocitaTimeCol` de [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/agenda/page.js) y [agenda.module.css](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/agenda/agenda.module.css), se renderiza el badge estilizado `.neocitaSessionBadge` con `Sesión {numeroSesion}` debajo de `⏱ {duracion} min`.
  3. **Preservación total de scroll en Agenda móvil y desktop**:
     - Se crearon las funciones `captureAgendaScroll(turnoId)` y `restoreAgendaScroll()` que guardan y restauran las posiciones de scroll de `<main>`, `calendarRef.current`, `gridBodyRef.current` y `window`, asociando el ID único `agenda-turno-${app.id}` a cada tarjeta de turno.
     - Se dispara la captura de scroll inmediatamente al tocar cualquier turno en la grilla diaria, semanal o mensual, y al hacer clic en `📁 Ficha Cliente`.
     - Se restaura el scroll automáticamente al cerrar el modal de turno y cuando finaliza la recarga de citas tras regresar de la ficha.
     - En [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/clientes/page.js) (`handleCloseProfile`), se agregó el parámetro `fromAgendaReturn=true` y en la Agenda se integró para que las fechas no se reseteen a "Hoy" al regresar de una ficha de cliente.
  4. **Mensaje oficial de reseña de Google**:
     - En [page.js](file:///c:/Users/Try%20Hard/Desktop/Nexte/gonzalo-dep/src/app/admin/agenda/page.js), se actualizó el texto del mensaje predeterminado y el enlace a `https://g.page/r/CZHRtLKRQ2dPEBE/review`.
- **Validación y Despliegue**:
  - Compilación local validada con `npm run build` (Turbopack, 49/49 páginas en 85s con 0 errores).
  - Push a `main` y `staging` (`9cf1acc`).
  - Despliegue seguro ejecutado con éxito en el VPS Hostinger (`187.127.9.216`, PM2 `gonzalo-agenda`, puerto 3006).
  - Backup de PostgreSQL generado exitosamente antes del despliegue (`agenda_db_pre_deploy_20261020_202443.sql`, 7.4MB).
  - Respuesta HTTP 200 OK validada en `https://agenda.depilacionparahombres.com`.
