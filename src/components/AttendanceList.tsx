"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
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
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableCaption>A list of all recorded attendances.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
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
              attendance.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center h-24">
                  No attendance records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
