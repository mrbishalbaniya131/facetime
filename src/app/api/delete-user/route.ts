import { NextRequest, NextResponse } from 'next/server';
import { deleteRegisteredUser, getRegisteredUserByName } from '@/lib/storage.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const existingUser = getRegisteredUserByName(name);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    deleteRegisteredUser(name);

    return NextResponse.json({ success: true, message: `User ${name} deleted.` });
  } catch (error: any) {
    console.error("Error in /api/delete-user:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
