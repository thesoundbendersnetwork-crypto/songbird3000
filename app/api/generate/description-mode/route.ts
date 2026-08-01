import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

export const dynamic = 'force-dynamic';

function getAudioFromPublicDatabase(prompt: string = "") {
  try {
    const dbPath = path.join(process.cwd(), 'public', 'audio-database.json');
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(content);
      if (db.tracks && db.tracks.length > 0) {
        const query = prompt.toLowerCase();
        const found = db.tracks.find((t: any) => 
          query.includes(t.genre?.toLowerCase()) || 
          (t.tags && t.tags.some((tag: string) => query.includes(tag.toLowerCase())))
        );
        if (found) return found;
        const index = Math.abs(prompt.length) % db.tracks.length;
        return db.tracks[index] || db.tracks[0];
      }
    }
  } catch (e) {
    console.error("Error reading audio database:", e);
  }
  return {
    audioUrl: "/audio/synthwave_sunset.wav",
    image: "https://picsum.photos/seed/sunset/400/400"
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.gpt_description_prompt || "A great song";
    
    let audioUrl = "";
    let lyricsText = "";
    let title = "Description Mode Song";
    let image = "https://picsum.photos/seed/" + Date.now() + "/400/400";
    let tags = "Custom";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt,
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text) {
            lyricsText += part.text;
          }
        }
      }

      if (audioBase64) {
        const ext = mimeType.split('/')[1] || 'wav';
        const filename = `lyria_desc_${Date.now()}.${ext}`;
        const publicDir = path.join(process.cwd(), 'public');
        const audioDir = path.join(publicDir, 'audio');
        
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

        const filePath = path.join(audioDir, filename);
        fs.writeFileSync(filePath, Buffer.from(audioBase64, 'base64'));
        audioUrl = `/audio/${filename}`;

        // Save to database
        const dbPath = path.join(publicDir, 'audio-database.json');
        let database = { databaseName: "Public Local Audio Library", folderPath: "/public/audio", tracks: [] as any[] };
        if (fs.existsSync(dbPath)) {
          database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
        
        const trackId = "track_desc_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const newTrack = {
          id: trackId,
          filename: filename,
          title: title,
          artist: "Lyria AI (Desc)",
          genre: tags,
          audioUrl: audioUrl,
          image: image,
          bpm: 120,
          key: "C Major",
          format: ext.toUpperCase(),
          size: (Buffer.from(audioBase64, 'base64').length / (1024 * 1024)).toFixed(1) + " MB",
          tags: ["ai", "lyria", ext.toLowerCase()]
        };
        database.tracks.push(newTrack);
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
      }
    } catch (apiError: any) {
      console.warn("Lyria API error, falling back to database:", apiError?.message || apiError);
      if (apiError?.message?.includes("429") || apiError?.status === 429) {
        return NextResponse.json({ error: "Lyria API quota exceeded. Please configure a Paid tier GEMINI_API_KEY in settings to use music generation." }, { status: 429 });
      }
    }

    if (!audioUrl) {
      const track = getAudioFromPublicDatabase(prompt);
      audioUrl = track.audioUrl;
      image = track.image || image;
      title = track.title || title;
    }

    const mockResponse = {
      id: "suno_desc_" + Date.now(),
      status: "submitted",
      clips: [
        {
          id: "clip_desc_" + Date.now(),
          audio_url: audioUrl,
          image_url: image,
          title: title,
          model_name: body.mv || "chirp-v3-0",
          metadata: {
            gpt_description_prompt: prompt,
            lyrics: lyricsText,
            make_instrumental: body.make_instrumental || false,
          }
        }
      ]
    };
    return NextResponse.json(mockResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
