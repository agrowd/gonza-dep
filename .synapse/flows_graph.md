# flows_graph.md - Flujos de Lógica del Sistema

## 🔄 Flujo de Reserva Online (Público)
```mermaid
graph TD
    A[Cliente entra a Reserva Online] --> B[Ingresa Datos Personales]
    B --> C[Selecciona Zonas / Servicios]
    C --> D[Sistema calcula precio, seña y duración]
    D --> E[Cliente ve y selecciona Horarios disponibles]
    E --> F[Cliente acepta condiciones y políticas]
    F --> G[Cliente simula/realiza pago de seña]
    G --> H[Turno creado como 'Pendiente de autorización']
    H --> I[Admin recibe notificación interna]
    I --> J{Admin Aprueba?}
    J -- Sí --> K[Turno pasa a 'Señado / Confirmado']
    K --> L[Se envía email y WhatsApp de confirmación]
    J -- No --> M[Se rechaza la reserva y libera horario]
    M --> N[Se define devolución/crédito de seña]
```

## ⏱️ Regla de Cálculo de Duración y Redondeo
```text
1. Base = Duración de la zona de mayor tiempo.
2. Adicionales = Cada zona adicional suma 50% de su duración base.
3. Si es cliente nuevo = Suma 10 minutos.
4. Redondeo = Se redondea hacia arriba al múltiplo de 10 minutos más cercano.
```
