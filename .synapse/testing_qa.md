# testing_qa.md - Tracker de Calidad y Casos de Prueba

## 🧪 Casos de Prueba Críticos

### 1. Cálculo de Duración de Turnos (Algoritmo)
- **Caso A (Cliente recurrente)**:
  - Piernas (40 min) + Glúteos (20 min) + Axilas (10 min).
  - Cálculo: 40 + (20 * 0.5) + (10 * 0.5) = 40 + 10 + 5 = 55 min.
  - Redondeo: 60 minutos.
- **Caso B (Cliente nuevo)**:
  - Piernas (40 min) + Glúteos (20 min) + Axilas (10 min) + Nuevo Cliente (+10 min).
  - Cálculo: 55 + 10 = 65 min.
  - Redondeo: 70 minutos.
- **Caso C (Un solo servicio)**:
  - Espalda (30 min).
  - Redondeo: 30 minutos.

### 2. Vista de Calendario (Agenda)
- Bloques de 10 minutos sin superposiciones visuales.
- Despliegue correcto de los estados (Señado, Realizado, Cancelado, etc.) con sus respectivos colores.

### 3. Reserva Online
- Restricción de horarios: la reserva online solo muestra horarios disponibles.
- Los clientes externos no pueden ver datos privados (nombres, zonas) de otros turnos en la grilla horaria.

### 4. Sincronización de Ficha Clínica y Agenda (Fecha Primer Turno y Sesiones)
- **Caso A (Auto-guardado al navegar a Ficha)**:
  - Al abrir un turno en la Agenda de un cliente con `fechaPrimerTurno` sugerida o sesiones modificadas, al hacer clic en `📁 Ficha Cliente` el sistema debe persistir asíncronamente en PostgreSQL antes de redirigir.
  - Verificado en Staging: Ricardo Palavecino (`rickyp84@hotmail.com`), persistió `fechaPrimerTurno = '2026-07-29'` y se reflejó en `Notas y Configuración`.
- **Caso B (Reactividad Total / Previas en Ficha)**:
  - En `/admin/clientes`, `Sesiones Realizadas (Total)` y `Sesiones Previas (Externas)` deben estar vinculadas: modificar el total recalcula las previas restando los turnos `REALIZADO` del sistema.
  - Verificado en Staging: Ricardo Palavecino con 2 turnos realizados muestra `2 (2 sis + 0 prev)`.

## 🐛 Registro de Bugs (Issues Tracker)
- **ISSUE-01 (Solucionado)**: Al consultar o guardar fecha primer turno / sesiones en modal de Agenda, no se reflejaban en la configuración de la Ficha del Cliente (`/admin/clientes`). Solucionado incorporando `isFechaPrimerChanged` e `isSesionesPreviasChanged` en `checkHasUnsavedChanges()`, auto-guardado en navegación con `await`, fallback de fecha más antigua en Ficha y sincronización reactiva de sesiones totales/previas (Decisión D-77).
