import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';

const conn = new Client();

const FILES_TO_DEPLOY = [
  'src/lib/whatsapp.js',
  'src/app/api/admin/clientes/route.js',
  'src/app/api/admin/clientes/[id]/route.js',
  'src/app/api/reservas/crear/route.js',
  'src/app/api/admin/turnos/route.js',
  'src/app/page.js',
  'src/app/page.module.css',
  'src/app/admin/clientes/page.js',
  'src/app/admin/clientes/clientes.module.css',
  'src/app/api/admin/turnos/imprimir/route.js',
  'src/app/admin/agenda/imprimir/page.js',
  'src/app/admin/agenda/imprimir/imprimir.module.css',
  'src/app/admin/agenda/page.js'
];

const REMOTE_BASE_DIR = '/srv/gonzalo-dep';

conn.on('ready', () => {
  console.log('✅ Conectado por SSH al VPS. Iniciando SFTP...');
  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('❌ Error iniciando SFTP:', err);
      conn.end();
      return;
    }

    let filesUploaded = 0;

    for (let i = 0; i < FILES_TO_DEPLOY.length; i++) {
      const localRelative = FILES_TO_DEPLOY[i];
      const localPath = path.resolve(process.cwd(), localRelative);
      const remotePath = path.posix.join(REMOTE_BASE_DIR, localRelative);

      console.log(`Subiendo [${i + 1}/${FILES_TO_DEPLOY.length}]: ${localRelative} -> ${remotePath}`);

      // Ensure remote directory structure exists
      const remoteDir = path.posix.dirname(remotePath);
      await new Promise((resolveDir) => {
        // En Linux, creamos la estructura de forma directa con mkdir -p usando ssh exec
        conn.exec(`mkdir -p "${remoteDir}"`, (errExec) => {
          resolveDir();
        });
      });

      // Upload file via SFTP
      await new Promise((resolveUpload, rejectUpload) => {
        sftp.fastPut(localPath, remotePath, (errPut) => {
          if (errPut) {
            console.error(`❌ Error subiendo ${localRelative}:`, errPut);
            rejectUpload(errPut);
          } else {
            filesUploaded++;
            resolveUpload();
          }
        });
      });
    }

    console.log(`\n🎉 SFTP completo. ${filesUploaded} archivos subidos con éxito.`);
    console.log('Reconstruyendo Next.js y reiniciando PM2 en el VPS...');

    conn.exec(`cd ${REMOTE_BASE_DIR} && chmod +x deploy.sh && ./deploy.sh`, (errCmd, stream) => {
      if (errCmd) {
        console.error('❌ Error ejecutando deploy.sh:', errCmd);
        conn.end();
        return;
      }

      stream.on('data', (data) => {
        process.stdout.write(data.toString());
      }).on('close', (code) => {
        console.log(`\n✓ Servidor reiniciado con código de salida: ${code}`);
        conn.end();
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err);
}).connect({
  host: '187.127.9.216',
  port: 22,
  username: 'root',
  password: 'eI+e3()6bflOG3Yq'
});
