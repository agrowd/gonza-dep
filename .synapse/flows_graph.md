# flows_graph.md - Flujos de Lógica del Sistema

## 🔄 Flujo de Reserva Online (Público)
```mermaid
graph TD
    A[Cliente entra a Reserva Online] --> B[Ingresa DNI]
    B --> C{¿Ya está registrado?}
    C -- Sí --> D[Autocompleta datos de contacto y salta al Paso 2]
    C -- No --> E[Muestra campos Nombre, Whatsapp y Email para registrarse]
    D --> F[Selecciona Zonas / Servicios]
    E --> F
    F --> G[Sistema calcula precio, seña y duración]
    G --> H[Cliente selecciona Horario disponible de la grilla]
    H --> I[Cliente acepta condiciones y políticas]
    I --> J[Cliente realiza pago de seña en MercadoPago]
    J --> K[El turno se crea como PENDIENTE_PAGO por 5 min]
    K --> L{¿Pago aprobado por MP Webhook?}
    L -- Sí --> M[Turno pasa automáticamente a SEÑADO]
    M --> N[Se despacha correo y WhatsApp de confirmación automáticamente]
    L -- No/Expirado --> O[El turno se descarta y el slot se libera]
```

## ⏱️ Regla de Cálculo de Duración y Redondeo
```text
1. Base = Duración de la zona de mayor tiempo.
2. Adicionales = Cada zona adicional suma 50% de su duración base.
3. Redondeo = Se redondea hacia arriba al múltiplo de 10 minutos más cercano.
4. Interno = Para el cálculo de disponibilidad y resumen del cliente se asume isNewClient=false. El bonus de nuevo cliente (+10 min) es una reserva operativa interna de administración.
```

