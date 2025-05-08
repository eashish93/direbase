import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const revalidate = 0;

const MAX_SIZE = 1024 * 1024 * 10; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    const contentType = file.type;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    } 

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: `File size ${file.size} exceeds ${MAX_SIZE} limit.` }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ success: false, error: 'Invalid file type.' }, { status: 400 });
    }


    const ctx = await getCloudflareContext({ async : true });
    const r2Binding = ctx.env.R2_B;
    if (!r2Binding) {
      console.error('R2 binding missing in API route context.');
      return NextResponse.json(
        { success: false, error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const ext = file.name.split('.').pop();
    const key = `${crypto.randomBytes(16).toString('hex')}${ext ? '.' + ext : ''}`;
    const keyWithDir = `direbase/${key}`;


    await r2Binding.put(keyWithDir, file);
    return NextResponse.json({ success: true, key: keyWithDir });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
  const ctx = await getCloudflareContext({ async : true });
  const r2Binding = ctx.env.R2_B;
  if (!r2Binding) {
    console.error('R2 binding missing in API route context.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ success: false, error: 'Key is required.' }, { status: 400 });
  }

  const object = await r2Binding.get(key);
  if (!object) {
    return NextResponse.json({ success: false, error: 'Object not found.' }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    },
  });
}
