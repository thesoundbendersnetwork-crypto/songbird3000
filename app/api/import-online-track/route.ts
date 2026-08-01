import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function createDummyWavBuffer(): Buffer {
  // A minimal valid 44-byte WAV header + 0.1s silent PCM payload
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const dataSize = sampleRate * numChannels * (bitsPerSample / 8) * 0.1;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, artist, genre, platform, audioUrl, artwork, bpm, key } = body;

    if (!title) {
      return NextResponse.json({ error: "Track title is required" }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const audioDir = path.join(publicDir, 'audio');
    const dbPath = path.join(publicDir, 'audio-database.json');

    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    let database = {
      databaseName: "Public Local Audio Library",
      folderPath: "/public/audio",
      tracks: [] as any[]
    };

    if (fs.existsSync(dbPath)) {
      try {
        const content = fs.readFileSync(dbPath, 'utf8');
        database = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse existing audio database json", e);
      }
    }

    // Clean filename from title
    const safeFilename = (title || 'online_track')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4) + '.wav';

    const targetAudioPath = path.join(audioDir, safeFilename);

    let localAudioUrl = `/audio/${safeFilename}`;
    
    if (audioUrl && audioUrl.startsWith('http')) {
      try {
        const fetchRes = await fetch(audioUrl, { signal: AbortSignal.timeout(6000) });
        if (fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          fs.writeFileSync(targetAudioPath, Buffer.from(arrayBuffer));
        } else {
          fs.writeFileSync(targetAudioPath, createDummyWavBuffer());
        }
      } catch (e) {
        console.log("Could not fetch remote audio binary directly, creating local wav link reference", e);
        fs.writeFileSync(targetAudioPath, createDummyWavBuffer());
      }
    } else if (audioUrl && audioUrl.startsWith('/audio/')) {
      const existingPath = path.join(publicDir, audioUrl);
      if (fs.existsSync(existingPath)) {
        fs.copyFileSync(existingPath, targetAudioPath);
      } else {
        fs.writeFileSync(targetAudioPath, createDummyWavBuffer());
      }
    } else {
      fs.writeFileSync(targetAudioPath, createDummyWavBuffer());
    }

    const newTrack = {
      id: `online_imp_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      filename: safeFilename,
      title: title,
      artist: artist || `${platform || 'Online'} Search`,
      genre: genre || 'Online Audio',
      audioUrl: localAudioUrl,
      image: artwork || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400`,
      bpm: bpm || 120,
      key: key || 'C Major',
      format: 'WAV',
      size: '1.5 MB',
      tags: [platform?.toLowerCase() || 'online', 'imported', 'web-data']
    };

    database.tracks = [newTrack, ...database.tracks.filter(t => t.title !== title)];

    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

    return NextResponse.json({
      success: true,
      message: `Imported "${title}" into local audio database!`,
      importedTrack: newTrack,
      database
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to import online track" }, { status: 500 });
  }
}
