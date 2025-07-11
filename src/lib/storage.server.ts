// A "server-side" version of storage access.
// In a real app, this would be a proper database client (e.g., Prisma, node-postgres).
// For this prototype, we'll read/write to a local JSON file to simulate a persistent store.
// NOTE: This file-based approach is NOT suitable for production due to race conditions.

import fs from 'fs';
import path from 'path';
import type { RegisteredUser, Authenticator } from "@/types";

const DB_PATH = path.join(process.cwd(), 'user-db.json');

function readDb(): RegisteredUser[] {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return [];
        }
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to read user DB", e);
        return [];
    }
}

function writeDb(data: RegisteredUser[]): void {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to write user DB", e);
    }
}

export const getRegisteredUserByName = (name: string): RegisteredUser | undefined => {
    const users = readDb();
    return users.find(u => u.name === name);
};

export const addRegisteredUser = (newUser: RegisteredUser): void => {
  const users = readDb();
  const userIndex = users.findIndex(u => u.name === newUser.name);
  if (userIndex > -1) {
      // User exists, update their descriptor but preserve authenticators.
      const existingUser = users[userIndex];
      users[userIndex] = {
        ...existingUser, // Keep existing data like authenticators
        ...newUser,      // Overwrite with new data like descriptor
      };
  } else {
      // User doesn't exist, add them.
      users.push(newUser);
  }
  writeDb(users);
};


export const addAuthenticatorToUser = (name: string, newAuthenticator: Authenticator) => {
    let users = readDb();
    let user = users.find(u => u.name === name);

    if (user) {
        if (!user.authenticators) {
            user.authenticators = [];
        }
        user.authenticators.push(newAuthenticator);
    } else {
        // Create user if they don't exist
        user = { name, descriptor: undefined, authenticators: [newAuthenticator] };
        users.push(user);
    }
    writeDb(users);
};

export const updateUserAuthenticatorCounter = (name: string, credentialID: string, newCounter: number) => {
    let users = readDb();
    const userIndex = users.findIndex(u => u.name === name);
    if (userIndex > -1) {
        const authIndex = users[userIndex].authenticators.findIndex(a => a.credentialID === credentialID);
        if (authIndex > -1) {
            users[userIndex].authenticators[authIndex].counter = newCounter;
            writeDb(users);
        }
    }
};
