import { NextResponse } from 'next/server';
import { requireAppApiSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing YouTube API key' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }
  if (query.trim().length > 120) {
    return NextResponse.json({ error: 'Search query is too long' }, { status: 400 });
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    maxResults: '1',
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    videoCategoryId: '17',
    q: query.trim(),
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Failed to reach YouTube' },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: 'YouTube request failed' },
      { status: 502 }
    );
  }

  const data = await response.json();
  const item = data?.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) {
    return NextResponse.json({ error: 'No video found' }, { status: 404 });
  }

  const snippet = item?.snippet || {};
  const thumbnail =
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    null;

  return NextResponse.json(
    {
      videoId,
      title: snippet?.title || 'Workout demo',
      channelTitle: snippet?.channelTitle || '',
      thumbnailUrl: thumbnail,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
