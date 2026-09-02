# env_manager.md - Configuración de Entornos

## 💻 [L] Local Development
- **Puerto de desarrollo**: `http://localhost:3006`
- **Base de datos local**: SQLite (`file:./dev.db` para facilitar desarrollo sin instalar bases de datos en la máquina local).
- **Variables de Entorno (.env)**:
  ```env
  DATABASE_URL="file:./dev.db"
  NEXTAUTH_SECRET="secret-local-key"
  NEXT_PUBLIC_APP_URL="http://localhost:3006"
  ```

## 🌐 [P] Producción VPS (Hostinger VPS)
- **IP / Dominio**: `https://agenda.depilacionparahombres.com` (puerto interno 3006)
- **Directorio**: `/srv/gonzalo-dep`
- **PM2**: `gonzalo-agenda` (ID 108)
- **Base de Datos**: PostgreSQL `agenda_db`
- **WhatsApp**: Conectado y activo (Puppeteer headless)
- **Rama Git**: `main`

## 🧪 [S] Staging / Pruebas VPS (Hostinger VPS)
- **URL**: `http://187.127.9.216:3008` (puerto 3008)
- **Directorio**: `/srv/gonzalo-dep-staging`
- **PM2**: `gonzalo-agenda-staging` (ID 129)
- **Base de Datos**: PostgreSQL `agenda_db_staging` (clonada de producción, aislada)
- **WhatsApp**: `WHATSAPP_ENABLED="false"` (para no interferir con la sesión de producción ni enviar mensajes a clientes reales)
- **Rama Git**: `staging`
- **Despliegue**: `node scratch/deploy_vps_staging.js`

