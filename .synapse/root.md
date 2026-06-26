# Project Root - AppWeb Agenda

## 📌 Descripción General
Aplicación web full-stack para la gestión interna de turnos, clientes, recordatorios automáticos y estadísticas para el centro de depilación láser masculina "Gonzalo Depilación para Hombres". Cuenta con un flujo público interactivo de reservas online integrado con la pasarela de MercadoPago, confirmación de turnos automática tras el pago, y envíos transaccionales automáticos por correo electrónico y WhatsApp.

## 🏗️ Arquitectura del Sistema
- **Frontend & Backend (Full-stack)**: Next.js 16 (App Router) con soporte para Server Actions y API Routes dinámicas.
- **Base de Datos**: PostgreSQL en producción (Hostinger VPS) y SQLite en desarrollo local, gestionados mediante Prisma ORM.
- **Notificaciones**: 
  - **WhatsApp**: Automatizado mediante `whatsapp-web.js` (Puppeteer headless en el VPS). Cuenta con un cron de recordatorios en background que busca citas a las 48 horas y las despacha cada día entre las 10:00 y 11:00 AM.
  - **Email**: Notificaciones transaccionales automáticas para altas, cancelaciones e inasistencias (`NO_ASISTIO`) usando `nodemailer` y plantillas de diseño HTML premium.
- **Estilos**: Vanilla CSS con CSS Modules para máxima personalización y adaptabilidad (incluyendo vista diaria forzada en pantallas móviles).

## 📁 Estructura del Proyecto
```text
gonzalo-dep/
├── .synapse/             # Ariadne Engine Metadata (Cortex)
│   ├── root.md           # Mapa central del proyecto
│   ├── decisions.md      # Registro de decisiones de arquitectura
│   ├── env_manager.md    # Configuración de entornos locales y VPS
│   ├── flows_graph.md    # Flujos y lógica del sistema
│   ├── testing_qa.md     # Casos de prueba y calidad
│   ├── workcycle.md      # Registro de trabajo de sesiones
│   ├── errores.md        # Historial de bugs resueltos
│   └── changelog.md      # Historial de versiones y cambios
├── prisma/               # Esquemas y scripts de base de datos
│   ├── schema.prisma     # Modelos de base de datos (PostgreSQL/SQLite)
│   └── seed.js           # Semillero de datos iniciales (Admin y Zonas)
├── public/               # Recursos estáticos (Logos e imágenes de marca)
├── src/                  # Código fuente de Next.js
│   ├── app/              # Rutas del App Router (Páginas y APIs)
│   ├── lib/              # Librerías (Auth, DB, Email, WhatsApp)
└── deploy.sh             # Script para automatizar despliegues en el VPS
```

## 🚀 Estado Actual
- **Producción**: Totalmente operativo bajo dominio HTTPS seguro en `https://agenda.depilacionparahombres.com`.
- **Automatizaciones**: El servicio de WhatsApp se reconecta y restablece su sesión de Puppeteer mediante persistencia de `.wwebjs_auth`. Los correos SMTP transaccionales de Hostinger están verificados y funcionando de forma segura.
