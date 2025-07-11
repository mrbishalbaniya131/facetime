import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getRegisteredUserByName } from '@/lib/storage.server';

const rpID = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_RP_ID || 'facetime-attendance.app') 
  : 'localhost';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  
  const user = getRegisteredUserByName(username);
  if (!user || !user.authenticators || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'User has no registered authenticators'}, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.authenticators.map(auth => ({
      id: Uint8Array.from(Buffer.from(auth.credentialID, 'base64url')),
      type: 'public-key',
      transports: auth.transports,
    })),
    userVerification: 'preferred',
  });

  if (typeof global.challengeStore === 'undefined') {
    global.challengeStore = {};
  }
  global.challengeStore[username] = options.challenge;

  return NextResponse.json(options);
}


declare global {
  var challengeStore: Record<string, string>;
}
