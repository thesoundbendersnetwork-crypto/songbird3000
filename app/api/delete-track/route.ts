import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, filename } = body;

    if (!id && !filename) {
      return NextResponse.json({ error: "Track ID or filename is required" }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const audioDir = path.join(publicDir, 'audio');
    const dbPath = path.join(publicDir, 'audio-database.json');

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
        console.error("Failed to parse audio database json", e);
      }
    }

    // Filter out track by ID or filename
    const initialCount = database.tracks.length;
    database.tracks = database.tracks.filter((t: any) => {
      if (id && t.id === id) return false;
      if (filename && t.filename === filename) return false;
      return true;
    });

    // Write updated database JSON
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

    // Optionally delete imported file from audio folder if not a core default track
    const protectedFiles = [
      'synthwave_sunset.wav',
      'midnight_horizon.wav',
      'crumblin_down.wav',
      'dragula.wav',
      'have_you_ever_seen_the_rain.wav',
      'i_hate_myself_for_loving_you.wav',
      'i_would_walk_500_miles.wav'
    ];

    if (filename && !protectedFiles.includes(filename)) {
      const filePath = path.join(audioDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Failed to remove audio file from disk:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted track successfully (${initialCount - database.tracks.length} removed)`,
      database
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete track" }, { status: 500 });
  }
}
