import { NextResponse } from 'next/server';
import fs from 'fs';
import { resolveUploadFilePath, getMimeTypeFromFilename } from '@/lib/uploads.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    const filePath = resolveUploadFilePath(filename);

    if (!filePath) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const contentType = getMimeTypeFromFilename(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('[API Uploads] Error serving file:', error);
    return NextResponse.json({ error: 'Error al leer archivo' }, { status: 500 });
  }
}
