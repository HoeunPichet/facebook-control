import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');

  if (!pathname) {
    return new NextResponse('Missing pathname', { status: 400 });
  }

  // Prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(process.cwd(), '.blob-local', safePath);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === '.json') contentType = 'application/json';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    },
  });
}

