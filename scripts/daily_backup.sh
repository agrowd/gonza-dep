#!/bin/bash
set -eo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

BACKUP_DIR="/srv/gonzalo-dep/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="agenda_db_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "=========================================================="
echo "=== [$(date)] 1. Generando dump comprimido de agenda_db ==="
echo "=========================================================="
PGPASSWORD=gonzalo123 pg_dump -U gonzalo_admin -h localhost agenda_db | gzip > "$FILEPATH"
chmod 600 "$FILEPATH"

FILESIZE=$(ls -lh "$FILEPATH" | awk '{print $5}')
echo "✅ Backup local creado: $FILEPATH ($FILESIZE)"

echo "=========================================================="
echo "=== [$(date)] 2. Subiendo a Google Drive (AgendaBackups/) ==="
echo "=========================================================="
rclone copy "$FILEPATH" gdrive:AgendaBackups/ --log-level INFO

echo "=========================================================="
echo "=== [$(date)] 3. Limpieza de backups locales (> 30 días) ==="
echo "=========================================================="
find "$BACKUP_DIR" -name "agenda_db_*.sql.gz" -mtime +30 -delete

echo "=========================================================="
echo "=== [$(date)] 4. Limpieza en Google Drive (> 30 días) ==="
echo "=========================================================="
rclone delete gdrive:AgendaBackups/ --min-age 30d || true

echo "=========================================================="
echo "=== [$(date)] Backup y sincronización completados con éxito ==="
echo "=========================================================="
