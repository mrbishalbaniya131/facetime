export interface Authenticator {
  credentialID: string;
  credentialPublicKey: number[];
  counter: number;
  transports?: AuthenticatorTransport[];
}

export interface RegisteredUser {
  name: string;
  descriptor?: number[];
  authenticators: Authenticator[];
}

export interface AttendanceRecord {
  id: string;
  name: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  method?: 'Face' | 'Two-Factor';
}
