import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || "";
    return NextResponse.json({
      id: "lyrics_" + Date.now(),
      status: "complete",
      title: "Generated Lyrics",
      text: `[Verse 1]\nWalking down the midnight avenue\nReflections in the rain\n\n[Chorus]\nCalling out your name in the dark\nWaiting for a spark`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
