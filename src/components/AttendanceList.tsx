"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { getAttendanceLog } from "@/lib/storage";
import type { AttendanceRecord } from "@/types";
import { User, Clock } from "lucide-react";

export default function AttendanceList() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const log = getAttendanceLog();
    // Sort by most recent first
    log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAttendance(log);

    const handleStorageChange = () => {
       const updatedLog = getAttendanceLog();
       updatedLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
       setAttendance(updatedLog);
    };

    window.addEventListener('storage', handleStorageChange);

    // Refresh on focus to catch updates from other tabs
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };

  }, []);

  return (
      <Table>
        <TableCaption>A list of recent attendance records.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timestamp
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.length > 0 ? (
            attendance.slice(0, 5).map((record, index) => ( // Show recent 5
              <TableRow key={index}>
                <TableCell className="font-medium">{record.name}</TableCell>
                <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="text-center h-24">
                No attendance records found for today.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
  );
}
