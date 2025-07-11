"use client";

import type { RegisteredUser, AttendanceRecord, Authenticator } from "@/types";

const USERS_KEY = "face-time-registered-users";
const LOG_KEY = "face-time-attendance-log";

// Functions for Registered Users
export const getRegisteredUsers = (): RegisteredUser[] => {
  if (typeof window === "undefined") return [];
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error) {
    console.error("Error reading registered users from localStorage", error);
    return [];
  }
};

export const getRegisteredUserByName = (name: string): RegisteredUser | undefined => {
    const users = getRegisteredUsers();
    return users.find(u => u.name === name);
}

export const addRegisteredUser = (newUser: RegisteredUser): void => {
  if (typeof window === "undefined") return;
  const users = getRegisteredUsers();
  // Check if user exists, if so, update, otherwise add
  const userIndex = users.findIndex(u => u.name === newUser.name);
  if (userIndex > -1) {
      // Preserve authenticators if they exist
      const existingUser = users[userIndex];
      users[userIndex] = { 
        ...newUser,
        authenticators: existingUser.authenticators || [],
       };
  } else {
      users.push(newUser);
  }

  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving registered user to localStorage", error);
  }
};

export const addAuthenticatorToUser = (name: string, newAuthenticator: Authenticator) => {
    const users = getRegisteredUsers();
    const userIndex = users.findIndex(u => u.name === name);
    if (userIndex > -1) {
        if (!users[userIndex].authenticators) {
            users[userIndex].authenticators = [];
        }
        users[userIndex].authenticators.push(newAuthenticator);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
        console.error(`User ${name} not found to add authenticator`);
    }
}

export const editRegisteredUser = (oldName: string, newName: string): void => {
  if (typeof window === "undefined") return;
  const users = getRegisteredUsers();
  const userIndex = users.findIndex(u => u.name === oldName);
  if (userIndex > -1) {
      users[userIndex].name = newName;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const deleteRegisteredUser = (name: string): void => {
  if (typeof window === "undefined") return;
  let users = getRegisteredUsers();
  users = users.filter(u => u.name !== name);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};


// Functions for Attendance Log
export const getAttendanceLog = (): AttendanceRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const logJson = localStorage.getItem(LOG_KEY);
    return logJson ? JSON.parse(logJson) : [];
  } catch (error) {
    console.error("Error reading attendance log from localStorage", error);
    return [];
  }
};

export const addAttendanceLog = (newRecord: AttendanceRecord): void => {
  if (typeof window === "undefined") return;
  const log = getAttendanceLog();
  log.push(newRecord);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
     window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error("Error saving attendance record to localStorage", error);
  }
};
