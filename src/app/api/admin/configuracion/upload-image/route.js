import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth.js';
import prisma from '@/lib/db.js';
import { saveUploadFile } from '@/lib/uploads.js';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'imagen';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate size (max 8MB)
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo permitido (8MB)' }, { status: 400 });
    }

    // Determine extension
    const originalName = file.name || 'image.jpg';
    let ext = path.extname(originalName).toLowerCase();
    if (!ext || !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      ext = '.jpg';
    }

    const cleanType = String(type).replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `new_client_${cleanType}_${Date.now()}${ext}`;

    const savedPath = saveUploadFile(filename, buffer);

    // Servir dinámicamente vía /api/uploads/[filename] para garantizar preview inmediato en producción Next.js
    const publicUrl = `/api/uploads/${filename}`;

    // Auto-persistir inmediatamente en Configuracion para evitar pérdida si el usuario no pulsa Guardar al final
    let persistedKey = null;
    if (cleanType === 'direccion') {
      persistedKey = 'wtsp_new_client_img_direccion';
    } else if (cleanType === 'indicaciones') {
      persistedKey = 'wtsp_new_client_img_indicaciones';
    }

    if (persistedKey) {
      await prisma.configuracion.upsert({
        where: { key: persistedKey },
        update: { value: publicUrl },
        create: { key: persistedKey, value: publicUrl }
      });
    }

    console.log(`[Upload Image] Successfully saved ${publicUrl} -> ${savedPath} (${buffer.length} bytes)${persistedKey ? ` [auto-saved ${persistedKey}]` : ''}.`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      persistedKey
    });
  } catch (error) {
    console.error('Error in upload-image route:', error);
    return NextResponse.json({ error: error.message || 'Error al subir la imagen' }, { status: 500 });
  }
}
