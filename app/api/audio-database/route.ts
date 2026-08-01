import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const audioDir = path.join(publicDir, 'audio');
    const dbPath = path.join(publicDir, 'audio-database.json');

    // Ensure directories exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    let database = {
      databaseName: "Public Local Audio Library",
      folderPath: "/public/audio",
      tracks: [] as any[]
    };

    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      database = JSON.parse(content);
    }

    // Scan /public/audio directory for any newly dropped WAV or MP3 files
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir);
      const audioFiles = files.filter(file => file.endsWith('.wav') || file.endsWith('.mp3') || file.endsWith('.ogg') || file.endsWith('.flac'));

      const existingFilenames = new Set(database.tracks.map(t => t.filename));

      for (const file of audioFiles) {
        if (!existingFilenames.has(file)) {
          const stats = fs.statSync(path.join(audioDir, file));
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(1) + " MB";
          const ext = path.extname(file).replace('.', '').toUpperCase();
          const cleanName = path.basename(file, path.extname(file)).replace(/_/g, ' ');

          database.tracks.push({
            id: "track_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            filename: file,
            title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
            artist: "Local User Upload",
            genre: "Custom Audio",
            audioUrl: `/audio/${file}`,
            image: "https://picsum.photos/seed/" + file + "/400/400",
            bpm: 120,
            key: "C Major",
            format: ext,
            size: sizeMB,
            tags: ["custom", "local", ext.toLowerCase()]
          });
        }
      }

      // Save updated database
      fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    }

    return NextResponse.json(database);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load database" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publicDir = path.join(process.cwd(), 'public');
    const dbPath = path.join(publicDir, 'audio-database.json');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(dbPath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true, database: body });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update database" }, { status: 500 });
  }
}
