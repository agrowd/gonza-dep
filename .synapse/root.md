# Project Root - AppWeb Agenda

## 📌 Descripción General
Aplicación web para la gestión interna de turnos, clientes, recordatorios y estadísticas para un centro de depilación láser masculina (inspirada en depilacionparahombres.com). Cuenta con una sección pública para que los clientes reserven turnos online con pago de seña ficticio/real y confirmación administrativa.

## 🏗️ Arquitectura del Sistema
- **Frontend & Backend (Full-stack)**: Next.js (App Router) o React + Express. (Por definir en la fase de planificación)
- **Base de Datos**: PostgreSQL / SQLite (propia del servidor) con Prisma ORM.
- **Notificaciones**: Integración para envío de WhatsApp (vía links directos o API de WhatsApp) y Emails (Nodemailer/SMTP o servicio externo).
- **Estilos**: CSS Puro / CSS Modules para un diseño premium y responsive, respetando la paleta de colores de `depilacionparahombres.com`.

## 📁 Estructura del Proyecto (Planificada)
```text
gonzalo-dep/
├── .synapse/             # Ariadne Engine Metadata
│   ├── root.md
│   ├── decisions.md
│   ├── env_manager.md
│   ├── flows_graph.md
│   ├── testing_qa.md
│   ├── workcycle.md
│   ├── errores.md
│   └── changelog.md
├── src/                  # Código fuente (a crear)
├── AppWeb Agenda.docx    # Documento de requerimientos original
└── chat.md               # Historial de chat con el usuario
```

## 🚀 Próximos Pasos
1. Definir la tecnología exacta (Next.js es la recomendación principal por ser full-stack y de fácil despliegue).
2. Crear la base de datos y esquema de datos (Prisma).
3. Diseñar y maquetar la interfaz pública (Reserva Online) e interna (Agenda, Clientes, Estadísticas, Notificaciones, Configuración).
4. Implementar las reglas de negocio de cálculo de duración y costos.
