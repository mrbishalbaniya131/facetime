import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRegisteredUserByName, updateUserAuthenticatorCounter } from '@/lib/storage.server';

const rpID = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_RP_ID || 'facetime-attendance.app') 
  : 'localhost';
const origin = process.env.NODE_ENV === 'production' 
  ? `https://${rpID}`
  : `http://${rpID}:9002`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, authResp } = body;

  if (!username || !authResp) {
      return NextResponse.json({ error: 'Missing username or authentication response' }, { status: 400 });
  }

  const user = getRegisteredUserByName(username);
  if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const expectedChallenge = global.challengeStore && global.challengeStore[username];
   if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  const authenticator = user.authenticators.find(
      auth => auth.credentialID === authResp.id
  );

  if (!authenticator) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 });
  }
  
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authResp,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        ...authenticator,
        credentialID: Uint8Array.from(Buffer.from(authenticator.credentialID, 'base64url')),
        credentialPublicKey: Uint8Array.from(authenticator.credentialPublicKey),
      },
      requireUserVerification: true,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  const { verified, authenticationInfo } = verification;
  if (verified) {
      const { newCounter } = authenticationInfo;
      updateUserAuthenticatorCounter(username, authenticator.credentialID, newCounter);
      delete global.challengeStore[username];
  }


  return NextResponse.json({ verified });
}


declare global {
  var challengeStore: Record<string, string>;
}
