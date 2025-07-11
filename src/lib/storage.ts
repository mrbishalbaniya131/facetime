"use client";

import type { RegisteredUser, AttendanceRecord } from "@/types";

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

export const addRegisteredUser = (newUser: RegisteredUser): void => {
  if (typeof window === "undefined") return;
  const users = getRegisteredUsers();
  users.push(newUser);
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving registered user to localStorage", error);
  }
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
  } catch (error) {
    console.error("Error saving attendance record to localStorage", error);
  }
};
