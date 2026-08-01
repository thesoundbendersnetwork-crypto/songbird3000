export interface AudioTrack {
  id: string;
  filename: string;
  title: string;
  artist: string;
  genre: string;
  audioUrl: string;
  image: string;
  bpm: number;
  key: string;
  format: string;
  size: string;
  tags: string[];
}

export interface AudioDatabase {
  databaseName: string;
  folderPath: string;
  tracks: AudioTrack[];
}

export async function fetchAudioDatabase(): Promise<AudioDatabase> {
  try {
    const response = await fetch('/audio-database.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to load public audio database, using default structure', error);
  }

  return {
    databaseName: "Public Local Audio Library",
    folderPath: "/public/audio",
    tracks: [
      {
        id: "track_1",
        filename: "crumblin_down.wav",
        title: "Crumblin Down",
        artist: "John Mellencamp Style",
        genre: "Rock",
        audioUrl: "/audio/crumblin_down.wav",
        image: "https://picsum.photos/seed/crumblin/400/400",
        bpm: 118,
        key: "E Major",
        format: "WAV",
        size: "2.8 MB",
        tags: ["rock", "energetic"]
      },
      {
        id: "track_2",
        filename: "synthwave_sunset.wav",
        title: "Synthwave Sunset",
        artist: "Songbird AI",
        genre: "Electronic",
        audioUrl: "/audio/synthwave_sunset.wav",
        image: "https://picsum.photos/seed/sunset/400/400",
        bpm: 120,
        key: "A Major",
        format: "WAV",
        size: "2.8 MB",
        tags: ["synth", "electronic"]
      }
    ]
  };
}

export function selectBestAudioFromDatabase(db: AudioDatabase, prompt: string, style: string): AudioTrack {
  const query = `${prompt} ${style}`.toLowerCase();
  
  // Look for matching tag or style in database
  const match = db.tracks.find(track => 
    query.includes(track.genre.toLowerCase()) || 
    track.tags.some(tag => query.includes(tag.toLowerCase())) ||
    query.includes(track.title.toLowerCase())
  );

  if (match) return match;

  // Fallback: pick a pseudo-random track from the public audio database based on prompt string length
  const index = Math.abs(prompt.length) % db.tracks.length;
  return db.tracks[index] || db.tracks[0];
}
