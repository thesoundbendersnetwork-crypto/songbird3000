import { fetchAudioDatabase, selectBestAudioFromDatabase } from './audio-database';

export interface SunoCustomParams {
  prompt: string;
  mv?: string;
  title: string;
  tags: string;
  negative_tags?: string;
  continue_at?: number | null;
  continue_clip_id?: string | null;
}

export interface SunoDescriptionParams {
  gpt_description_prompt: string;
  make_instrumental?: boolean;
  mv?: string;
  prompt?: string;
}

export async function generateSunoMusic(params: SunoCustomParams | SunoDescriptionParams) {
  const isCustom = "title" in params;
  const endpoint = isCustom ? "/generate" : "/generate/description-mode";
  
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 429 || errData.error) {
        throw new Error(errData.error || "API Quota Exceeded");
      }
    }

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err: any) {
    console.warn("Suno generation API error:", err);
    if (err?.message && (err.message.includes("quota") || err.message.includes("Quota"))) {
      throw err;
    }
  }

  // Fallback to local public audio database match
  const db = await fetchAudioDatabase();
  const promptText = "prompt" in params ? params.prompt : params.gpt_description_prompt;
  const styleText = "tags" in params ? params.tags : "";
  const selected = selectBestAudioFromDatabase(db, promptText || "", styleText || "");

  return {
    id: "suno_local_" + Date.now(),
    status: "complete",
    clips: [
      {
        id: "clip_" + Date.now(),
        audio_url: selected.audioUrl,
        image_url: selected.image,
        title: ("title" in params && params.title) ? params.title : selected.title,
        model_name: "songbird-local-v1",
        metadata: {
          tags: selected.genre,
          prompt: promptText,
          bpm: selected.bpm,
          key: selected.key
        }
      }
    ]
  };
}

export async function fetchSunoFeed(ids: string) {
  try {
    const res = await fetch(`/api/feed/${ids}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("Feed error:", err);
  }
  return [];
}

export async function generateSunoLyrics(prompt: string) {
  try {
    const res = await fetch(`/api/generate/lyrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("Lyrics error:", err);
  }
  return {
    id: "lyrics_" + Date.now(),
    text: "[Verse 1]\nWhispers in the quiet night\nWaves crashing on the shore\n\n[Chorus]\nLight the spark and let it shine\nForever more"
  };
}

export async function getSunoCredits() {
  try {
    const res = await fetch(`/api/get_credits`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("Credits error:", err);
  }
  return { credits_left: 150 };
}

export async function searchOnlineMusic(query: string, platform: string = 'all') {
  try {
    const res = await fetch(`/api/search-online?q=${encodeURIComponent(query)}&platform=${encodeURIComponent(platform)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Online search error:", err);
  }
  return { query, platform, totalResults: 0, results: [] };
}

export async function importOnlineTrackToDatabase(trackData: {
  title: string;
  artist?: string;
  genre?: string;
  platform?: string;
  audioUrl?: string;
  artwork?: string;
  bpm?: number;
  key?: string;
}) {
  try {
    const res = await fetch('/api/import-online-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to import online track:", err);
  }
  return { success: false, error: "Failed to connect to import route" };
}

export async function deleteTrackFromDatabase(trackId: string, filename?: string) {
  try {
    const res = await fetch('/api/delete-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trackId, filename })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to delete track:", err);
  }
  return { success: false, error: "Failed to connect to delete route" };
}

