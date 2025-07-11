import { NextRequest, NextResponse } from 'next/server';
import { addRegisteredUser } from '@/lib/storage.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, descriptor } = body;

    if (!name || !descriptor) {
      return NextResponse.json({ error: 'Missing name or descriptor' }, { status: 400 });
    }

    addRegisteredUser({ name, descriptor, authenticators: [] });

    return NextResponse.json({ success: true, message: `User ${name} registered.` });
  } catch (error: any) {
    console.error("Error in /api/register-user:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
