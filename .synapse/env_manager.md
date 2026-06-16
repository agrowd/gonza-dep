# env_manager.md - Configuración de Entornos

## 💻 [L] Local Development
- **Puerto de desarrollo**: `http://localhost:3000`
- **Base de datos local**: SQLite (`file:./dev.db` para facilitar desarrollo sin instalar bases de datos en la máquina local).
- **Variables de Entorno (.env)**:
  ```env
  DATABASE_URL="file:./dev.db"
  NEXTAUTH_SECRET="secret-local-key"
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  ```

## 🌐 [P] Producción VPS (DonWeb Debian)
- **Sistema Operativo**: Debian Linux (DonWeb VPS).
- **Base de Datos**: PostgreSQL (base de datos propia del servidor).
- **Servidor Web**: Nginx (como Proxy Inverso apuntando a `http://localhost:3000`).
- **Administrador de Procesos**: PM2 para mantener viva la aplicación Next.js.
- **Dependencias de Sistema para WhatsApp (whatsapp-web.js / Puppeteer)**:
  Dado que Debian en VPS viene sin interfaz gráfica, Puppeteer (Chromium headless) requiere instalar las siguientes librerías del sistema:
  ```bash
  sudo apt-get update
  sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
  ```
- **Variables de Entorno (.env.production)**:
  ```env
  DATABASE_URL="postgresql://usuario:password@localhost:5432/agenda_db"
  NEXTAUTH_SECRET="clave-secreta-produccion-muy-segura"
  NEXT_PUBLIC_APP_URL="https://agenda.depilacionparahombres.com" # Cambiar por dominio real
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="false"
  ```
