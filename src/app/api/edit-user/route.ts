import { NextRequest, NextResponse } from 'next/server';
import { editRegisteredUser, getRegisteredUserByName } from '@/lib/storage.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Missing old or new name' }, { status: 400 });
    }

    if (oldName === newName) {
        return NextResponse.json({ success: true, message: `User name is already ${newName}.` });
    }

    const existingUser = getRegisteredUserByName(oldName);
    if (!existingUser) {
      return NextResponse.json({ error: `User with name ${oldName} not found.` }, { status: 404 });
    }
    
    const newNameUser = getRegisteredUserByName(newName);
    if (newNameUser) {
        return NextResponse.json({ error: `User with name ${newName} already exists.` }, { status: 409 });
    }

    editRegisteredUser(oldName, newName);

    return NextResponse.json({ success: true, message: `User ${oldName} renamed to ${newName}.` });
  } catch (error: any) {
    console.error("Error in /api/edit-user:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
