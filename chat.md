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
   - En `VALOR ORIGINAL`, `SEÑA`, `SALDO`, `MÉTODO DE PAGO` y `DESCUENTO`, se protegió la etiqueta con `flex: 1 1 auto; min-width: 0; word-break: break-word` y el valor numérico con `flex: 0 0 auto; max-width: 55%; white-space: nowrap`. Ningún número se corta en el borde derecho en pantallas móviles (360px).
2. **Eliminación de la Trampa de Doble Scroll**:
   - Se configuró `.modalOverlay` con `overflow: hidden !important` y centrado flex. `.modalContent` actúa como único contenedor de desplazamiento con scroll táctil suave (`-webkit-overflow-scrolling: touch; overscroll-behavior: contain`) y `padding-bottom: 3.5rem !important`, despejando completamente el panel de acciones rápidas y el botón eliminar.
3. **Opacidad al 100% (No Transparente)**:
   - Se aplicó `background-color: var(--bg-card, #ffffff) !important` a `.modalContent` y `stickyModalHeader`, eliminando el efecto translúcido de `glass-card` que permitía que el calendario del fondo interfiriera visualmente.
4. **Cabecera y Entradas Clínicas Compactas**:
   - Reducción proporcional de tipografías en la cabecera fija y ajuste responsivo de los inputs de fecha (`Fecha 1° Turno` y `Cumpleaños`) a `125px` para evitar desbordes.

