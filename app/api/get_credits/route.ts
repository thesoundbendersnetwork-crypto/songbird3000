import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    credits_left: 150,
    period: "monthly",
    monthly_limit: 500,
    monthly_usage: 350
  });
}
