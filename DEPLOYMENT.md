# Guía de Despliegue en VPS Debian (DonWeb) - AppWeb Agenda

Esta guía describe los pasos necesarios para desplegar la aplicación **AppWeb Agenda** en un Servidor Privado Virtual (VPS) de DonWeb corriendo **Debian Linux**.

---

## 🏗️ Requisitos Previos del Sistema

### 1. Actualizar el sistema e instalar Node.js
Es recomendable utilizar Node.js v18 o superior. Ejecuta en la terminal:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Instalar dependencias nativas para `whatsapp-web.js` (Puppeteer)
Dado que Debian en VPS viene sin interfaz gráfica, el navegador headless (Chromium) utilizado por `whatsapp-web.js` para escanear y enviar mensajes necesita librerías gráficas básicas del sistema:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

### 3. Instalar y Configurar PostgreSQL
Instala PostgreSQL en el servidor:
```bash
sudo apt install postgresql postgresql-contrib -y
```

Inicia sesión en PostgreSQL para crear la base de datos y el usuario:
```bash
sudo -i -u postgres psql
```
Dentro de la consola interactiva de PostgreSQL, ejecuta:
```sql
CREATE DATABASE agenda_db;
CREATE USER gonzalo_admin WITH PASSWORD 'tu_clave_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE agenda_db TO gonzalo_admin;
\q
```

---

## 🚀 Despliegue de la Aplicación

### 1. Clonar el repositorio
Clona tu repositorio en el servidor (ej. `/var/www/gonzalo-dep`):
```bash
cd /var/www
git clone <url_de_tu_repositorio_github> gonzalo-dep
cd gonzalo-dep
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```

### 3. Configurar las Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:
```bash
nano .env
```
Copia y pega la siguiente configuración, reemplazando con tus datos reales:
```env
# URL de conexión para PostgreSQL en el servidor local
DATABASE_URL="postgresql://gonzalo_admin:tu_clave_segura_aqui@localhost:5432/agenda_db?schema=public"

# Clave secreta para la sesión de cookies
NEXTAUTH_SECRET="clave_altamente_secreta_y_aleatoria_para_cookies"

# URL pública de la aplicación
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"

# Credenciales de MercadoPago (Token de producción o Sandbox para testing)
MERCADOPAGO_ACCESS_TOKEN="APP_USR-XXXXXX-XXXXXX"
MERCADOPAGO_PUBLIC_KEY="APP_USR-XXXXXX-XXXXXX"
```

### 4. Inicializar y Poblar la Base de Datos
Ejecuta Prisma para crear las tablas en la base de datos PostgreSQL e inicializar el usuario administrador y las zonas base:
```bash
npx prisma db push
node prisma/seed.js
```
*(El seed creará por defecto el usuario administrador con las credenciales `admin` / `admin123` y cargará las 10 zonas por defecto)*.

### 5. Compilar la aplicación Next.js
```bash
npm run build
```

### 6. Administrar el proceso con PM2
Instala PM2 de forma global para mantener el servidor web levantado y auto-reiniciar en caso de caídas:
```bash
sudo npm install -y -g pm2
pm2 start npm --name "gonzalo-agenda" -- run start -- -p 3006
pm2 save
pm2 startup
```

---

## 🔒 Configurar Nginx como Proxy Inverso

Para servir la aplicación a través de HTTPS mediante un dominio real, instalaremos Nginx:
```bash
sudo apt install nginx -y
```

Crea una configuración para el sitio:
```bash
sudo nano /etc/nginx/sites-available/gonzalo-agenda
```
Pega la siguiente plantilla:
```nginx
server {
    listen 80;
    server_name tu-dominio.com; # Reemplaza por tu dominio

    # Configuración de límites de subida de archivos si es necesario
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Habilita la configuración y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/gonzalo-agenda /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Habilitar Certificado SSL Gratuito (Let's Encrypt)
Instala Certbot para Nginx para configurar HTTPS automáticamente:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```
Sigue los pasos interactivos para configurar la redirección automática a HTTPS.

---

## 📱 Vinculación de WhatsApp
Una vez que el sitio esté corriendo y accedas a tu panel de administración (`/admin`):
1. Ve a la pestaña de **Notificaciones** o **Configuración**.
2. Verás que el estado de WhatsApp indica "Esperando Escaneo" y cargará un código QR.
3. Abre WhatsApp en tu teléfono celular, ve a **Dispositivos Vinculados** -> **Vincular un dispositivo** y escanea el código QR de la pantalla.
4. El estado pasará a **Conectado** y los mensajes recordatorios y confirmaciones comenzarán a despacharse automáticamente.
