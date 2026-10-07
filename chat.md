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



