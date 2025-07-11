import { NextRequest, NextResponse } from 'next/server';
import { addRegisteredUser, getRegisteredUserByName } from '@/lib/storage.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, descriptor } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const existingUser = getRegisteredUserByName(name);
    if (existingUser) {
      // If user exists and we are providing a new descriptor, update it.
      if (descriptor) {
         addRegisteredUser({ ...existingUser, descriptor });
         return NextResponse.json({ success: true, message: `User ${name}'s face updated.` });
      }
      // If user exists and no descriptor is provided, it's a no-op but still success.
       return NextResponse.json({ success: true, message: `User ${name} already exists.` });
    }

    // If user does not exist, create them.
    addRegisteredUser({ name, descriptor: descriptor || undefined, authenticators: [] });

    return NextResponse.json({ success: true, message: `User ${name} registered.` });
  } catch (error: any) {
    console.error("Error in /api/register-user:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
