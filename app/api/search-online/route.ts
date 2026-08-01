import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || 'Drake';
    const platform = searchParams.get('platform') || 'all';

    const results: any[] = [];

    // 1. Fetch real song preview data from iTunes / Apple Music Public API
    if (platform === 'all' || platform === 'itunes' || platform === 'applemusic' || platform === 'spotify') {
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (itunesRes.ok) {
          const data = await itunesRes.json();
          if (data.results && Array.isArray(data.results)) {
            data.results.forEach((item: any) => {
              results.push({
                id: `itunes_${item.trackId}`,
                platform: item.kind === 'song' ? 'iTunes / Apple Music' : 'Apple Music',
                platformCode: 'applemusic',
                title: item.trackName || 'Unknown Title',
                artist: item.artistName || 'Unknown Artist',
                album: item.collectionName || '',
                genre: item.primaryGenreName || 'Music',
                audioUrl: item.previewUrl || '/audio/midnight_horizon.wav',
                artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://picsum.photos/seed/' + item.trackId + '/400/400',
                externalUrl: item.trackViewUrl || 'https://music.apple.com',
                duration: '0:30 (Preview)',
                bpm: 120 + (item.trackId % 20),
                key: ['C Major', 'G Major', 'A Minor', 'E Minor', 'D Major'][item.trackId % 5]
              });
            });
          }
        }
      } catch (err) {
        console.error("iTunes search error:", err);
      }
    }

    // 2. Simulated/Structured YouTube Music & SoundCloud Results based on Query
    if (platform === 'all' || platform === 'youtube') {
      results.push({
        id: `yt_${Date.now()}_1`,
        platform: 'YouTube Music',
        platformCode: 'youtube',
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} Official Audio`,
        artist: 'YouTube Audio Library',
        album: 'YouTube Creator Suite',
        genre: query,
        audioUrl: '/audio/synthwave_sunset.wav',
        artwork: `https://picsum.photos/seed/yt_${encodeURIComponent(query)}1/400/400`,
        externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        duration: '3:45',
        bpm: 124,
        key: 'A Major'
      });
      results.push({
        id: `yt_${Date.now()}_2`,
        platform: 'YouTube Music',
        platformCode: 'youtube',
        title: `Best of ${query} Mix 2026`,
        artist: 'Chill Beats Studio',
        album: 'Stream Vibes',
        genre: query,
        audioUrl: '/audio/midnight_horizon.wav',
        artwork: `https://picsum.photos/seed/yt_${encodeURIComponent(query)}2/400/400`,
        externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+music`,
        duration: '4:12',
        bpm: 118,
        key: 'E Minor'
      });
    }

    if (platform === 'all' || platform === 'soundcloud') {
      results.push({
        id: `sc_${Date.now()}_1`,
        platform: 'SoundCloud',
        platformCode: 'soundcloud',
        title: `${query} (Independent Remix)`,
        artist: 'SoundCloud Producer',
        album: 'Underground Essentials',
        genre: query,
        audioUrl: '/audio/dragula.wav',
        artwork: `https://picsum.photos/seed/sc_${encodeURIComponent(query)}1/400/400`,
        externalUrl: `https://soundcloud.com/search?q=${encodeURIComponent(query)}`,
        duration: '3:18',
        bpm: 128,
        key: 'B Minor'
      });
    }

    if (platform === 'all' || platform === 'spotify') {
      results.push({
        id: `sp_${Date.now()}_1`,
        platform: 'Spotify',
        platformCode: 'spotify',
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} Spotify Spotlight`,
        artist: 'Top Hits Radio',
        album: 'Global Charts',
        genre: query,
        audioUrl: '/audio/crumblin_down.wav',
        artwork: `https://picsum.photos/seed/sp_${encodeURIComponent(query)}1/400/400`,
        externalUrl: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
        duration: '3:30',
        bpm: 116,
        key: 'C Major'
      });
    }

    return NextResponse.json({
      query,
      platform,
      totalResults: results.length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to search online music" }, { status: 500 });
  }
}
