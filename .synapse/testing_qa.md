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

## 🐛 Registro de Bugs (Issues Tracker)
*Por el momento no hay bugs registrados. El proyecto está en fase de diseño.*
