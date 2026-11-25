import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ authenticated: true, user }, { headers: { 'Cache-Control': 'private, no-store' } });
}
