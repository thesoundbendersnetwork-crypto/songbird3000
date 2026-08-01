import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { aid: string } }) {
  const { aid } = params;
  return NextResponse.json([
    {
      id: aid,
      audio_url: "/audio/synthwave_sunset.wav",
      title: "Sample Suno Song",
      artist: "Suno AI",
      metadata: {
        tags: "rock electronic",
        duration: 142.5
      }
    }
  ]);
}
