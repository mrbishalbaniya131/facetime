import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getRegisteredUserByName } from '@/lib/storage.server'; // Server-side storage access

const rpName = 'FaceTime Attendance';
const rpID = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_RP_ID || 'facetime-attendance.app') 
  : 'localhost';
const origin = process.env.NODE_ENV === 'production' 
  ? `https://${rpID}`
  : `http://${rpID}:9002`;


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = getRegisteredUserByName(username) || {
      name: username,
      authenticators: []
  };

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: username,
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    excludeCredentials: user.authenticators.map(auth => ({
      id: auth.credentialID,
      type: 'public-key',
      transports: auth.transports,
    })),
    authenticatorSelection: {
        residentKey: 'discouraged',
        userVerification: 'preferred',
    }
  });

  // Temporarily store the challenge
  // In a real app, you'd store this in a session or database mapped to the user
  if (typeof global.challengeStore === 'undefined') {
    global.challengeStore = {};
  }
  global.challengeStore[username] = options.challenge;

  return NextResponse.json(options);
}

declare global {
  var challengeStore: Record<string, string>;
}
