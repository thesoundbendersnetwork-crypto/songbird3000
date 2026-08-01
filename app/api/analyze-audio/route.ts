import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Save file temporarily to disk because ai.files.upload needs a file path
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    
    const uploadResult = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType: file.type || 'audio/mp3' },
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        uploadResult,
        { text: 'Analyze this audio and output only a JSON object containing two keys: "key" (the musical key, e.g. "C Major", "G Minor") and "bpm" (the estimated tempo as a number). Do not include markdown formatting or backticks, just the raw JSON.' }
      ]
    });
    
    // Cleanup temp file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    
    const text = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || '{}';
    const analysis = JSON.parse(text);
    
    return NextResponse.json({
      bpm: analysis.bpm || 120,
      key: analysis.key || "Unknown"
    });

  } catch (error: any) {
    console.error("Audio analysis failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
