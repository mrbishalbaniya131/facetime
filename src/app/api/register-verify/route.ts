import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';
import { getRegisteredUserByName, addAuthenticatorToUser } from '@/lib/storage.server';
import type { Authenticator } from '@/types';


const rpID = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_RP_ID || 'facetime-attendance.app') 
  : 'localhost';
const origin = process.env.NODE_ENV === 'production' 
  ? `https://${rpID}`
  : `http://${rpID}:9002`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, regResp } = body;

  if (!username || !regResp) {
      return NextResponse.json({ error: 'Missing username or registration response' }, { status: 400 });
  }

  const user = getRegisteredUserByName(username) || {
      name: username,
      authenticators: []
  };

  const expectedChallenge = global.challengeStore && global.challengeStore[username];
  if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: regResp,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const newAuthenticator: Authenticator = {
      credentialID: Buffer.from(credentialID).toString('base64url'),
      credentialPublicKey: Array.from(credentialPublicKey), // Store as array of numbers
      counter,
      transports: regResp.response.transports,
    };
    
    // In a real app, you'd save this to a database
    addAuthenticatorToUser(username, newAuthenticator);
    delete global.challengeStore[username];

    return NextResponse.json({ verified: true, authenticator: newAuthenticator });
  }

  return NextResponse.json({ verified: false }, { status: 400 });
}

declare global {
  var challengeStore: Record<string, string>;
}
