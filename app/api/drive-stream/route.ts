import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
/** Vercel hobby ~10s; keep response streaming so the client can start playback early. */
export const maxDuration = 60;

/**
 * Proxies a public Google Drive file with Range support for <video> seeking.
 * File must be "Anyone with the link".
 *
 * Note: On Vercel, very large trailers may time out. Prefer short trailers
 * or host mp4s on Vercel Blob / R2 (MEDIA_BASE_URL).
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id || !/^[\w-]{10,}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  const range = request.headers.get('range') || undefined;
  const upstream = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: {
        ...(range ? { Range: range } : {}),
        'User-Agent': 'Mozilla/5.0 (compatible; BantanTV/1.0)',
      },
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json({ error: 'Drive fetch failed' }, { status: 502 });
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || contentType.includes('text/html')) {
    return NextResponse.json(
      { error: 'Drive file not streamable — set sharing to Anyone with the link' },
      { status: 502 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', contentType.includes('video') ? contentType : 'video/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  headers.set('Access-Control-Allow-Origin', '*');

  const len = res.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  const cr = res.headers.get('content-range');
  if (cr) headers.set('Content-Range', cr);

  return new NextResponse(res.body, { status: res.status, headers });
}
