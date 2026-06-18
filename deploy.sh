#!/bin/bash

# Color codes for stdout formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Iniciando Despliegue de AppWeb Agenda ===${NC}"

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: El archivo .env no existe en la raíz del proyecto.${NC}"
    echo -e "${YELLOW}Por favor, crea el archivo .env con las credenciales necesarias antes de continuar.${NC}"
    exit 1
fi

# 2. Install dependencies
echo -e "\n${GREEN}[1/5] Instalando dependencias de Node.js...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Error al instalar dependencias.${NC}"
    exit 1
fi

# 3. Database migrations (Prisma db push)
echo -e "\n${GREEN}[2/5] Actualizando estructura de base de datos...${NC}"
# Adapt schema.prisma dynamically from SQLite to PostgreSQL for production VPS
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
npx prisma db push
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}Error al sincronizar la base de datos.${NC}"
    exit 1
fi

# 4. Database Seed
echo -e "\n${GREEN}[3/5] Ejecutando poblamiento de base de datos (Seed)...${NC}"
node prisma/seed.js
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Advertencia: El script de seed podría haber fallado o el usuario ya existía.${NC}"
fi

# 5. Build application
echo -e "\n${GREEN}[4/5] Compilando la aplicación Next.js para producción...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error durante la compilación del build.${NC}"
    exit 1
fi

# 6. PM2 Management
echo -e "\n${GREEN}[5/5] Iniciando/Reiniciando proceso en PM2...${NC}"
if pm2 list | grep -q "gonzalo-agenda"; then
    echo -e "${YELLOW}Reiniciando proceso existente 'gonzalo-agenda'...${NC}"
    pm2 restart gonzalo-agenda
else
    echo -e "${YELLOW}Iniciando nuevo proceso 'gonzalo-agenda' en puerto 3005...${NC}"
    pm2 start npm --name "gonzalo-agenda" -- run start -- -p 3005
fi

# Save PM2 state
pm2 save

echo -e "\n${GREEN}=== ¡Despliegue finalizado con éxito! ===${NC}"
echo -e "La aplicación está corriendo en http://localhost:3005"
