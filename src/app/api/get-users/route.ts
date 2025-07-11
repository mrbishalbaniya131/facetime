
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { RegisteredUser } from "@/types";

const DB_PATH = path.join(process.cwd(), 'user-db.json');

function readDb(): RegisteredUser[] {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to read user DB", e);
        return [];
    }
}


export async function GET() {
  try {
    const users = readDb();
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error in /api/get-users:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
