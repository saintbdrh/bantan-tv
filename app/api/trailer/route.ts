import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim();

  if (!title) {
    return NextResponse.json({ youtubeId: null });
  }

  const youtubeId = (await searchWithApi(title)) ?? (await searchWithoutApi(title));
  return NextResponse.json({ youtubeId });
}

async function searchWithApi(title: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: '1',
    q: `${title} official trailer`,
    type: 'video',
    videoEmbeddable: 'true',
    key: apiKey
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return typeof payload.items?.[0]?.id?.videoId === 'string' ? payload.items[0].id.videoId : null;
}

async function searchWithoutApi(title: string): Promise<string | null> {
  const query = encodeURIComponent(`${title} official trailer`);
  const response = await fetch(`https://www.youtube.com/results?search_query=${query}&hl=en&gl=US`, {
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const match = html.match(/"videoId":"([\w-]{11})"/);
  return match?.[1] ?? null;
}
