import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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
    response = await fetch(url, { cache: 'no-store' });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Failed to reach YouTube' },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { error: 'YouTube request failed', details },
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
