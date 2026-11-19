import fs from 'fs';
import path from 'path';

const PERSISTENT_VPS_DIR = '/srv/gonzalo-uploads';

export function getPersistentUploadsDir() {
  try {
    if (process.platform !== 'win32' && fs.existsSync('/srv')) {
      if (!fs.existsSync(PERSISTENT_VPS_DIR)) {
        fs.mkdirSync(PERSISTENT_VPS_DIR, { recursive: true });
      }
      return PERSISTENT_VPS_DIR;
    }
  } catch (err) {
    console.warn('[Uploads] Could not access persistent VPS dir, falling back to public/uploads:', err.message);
  }
  const localDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

export function sanitizeUploadFilename(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const noQuery = raw.split('?')[0].split('#')[0].trim();
  if (noQuery.includes('..') || noQuery.includes('\\')) return null;
  const base = path.basename(noQuery);
  if (!base || base === '.' || base === '..' || !/^[a-zA-Z0-9._-]+$/.test(base)) {
    return null;
  }
  return base;
}

export function resolveUploadFilePath(urlOrFilename) {
  const safeName = sanitizeUploadFilename(urlOrFilename);
  if (!safeName) return null;

  const candidates = [];
  if (process.platform !== 'win32') {
    candidates.push(path.join(PERSISTENT_VPS_DIR, safeName));
  }
  candidates.push(path.join(process.cwd(), 'public', 'uploads', safeName));

  // Fallback for arbitrary relative path inside public/
  if (typeof urlOrFilename === 'string' && !urlOrFilename.includes('..')) {
    const cleanRel = urlOrFilename.split('?')[0].replace(/^\/+/, '');
    if (cleanRel.startsWith('uploads/')) {
      candidates.push(path.resolve(process.cwd(), 'public', cleanRel));
    }
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }

  return null;
}

export function saveUploadFile(filename, buffer) {
  const safeName = sanitizeUploadFilename(filename);
  if (!safeName) {
    throw new Error('Nombre de archivo inválido');
  }

  const persistentDir = getPersistentUploadsDir();
  const primaryPath = path.join(persistentDir, safeName);
  fs.writeFileSync(primaryPath, buffer);

  // Mirror inside public/uploads for backward compatibility
  const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (path.resolve(publicUploadsDir) !== path.resolve(persistentDir)) {
    try {
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicUploadsDir, safeName), buffer);
    } catch (mirrorErr) {
      console.warn('[Uploads] Mirror to public/uploads skipped:', mirrorErr.message);
    }
  }

  return primaryPath;
}

export function getMimeTypeFromFilename(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase().replace('.', '');
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
}
