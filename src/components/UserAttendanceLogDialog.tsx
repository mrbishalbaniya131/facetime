
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAttendanceLog } from "@/lib/storage";
import type { AttendanceRecord } from "@/types";

interface UserAttendanceLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userName: string;
}

export function UserAttendanceLogDialog({ isOpen, onOpenChange, userName }: UserAttendanceLogDialogProps) {
  const [userLogs, setUserLogs] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (isOpen && userName) {
      const allLogs = getAttendanceLog();
      const filteredLogs = allLogs
        .filter(log => log.name === userName)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setUserLogs(filteredLogs);
    }
  }, [isOpen, userName]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attendance Log for {userName}</DialogTitle>
          <DialogDescription>
            Showing all recorded attendance entries for this user.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Location</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userLogs.length > 0 ? (
                        userLogs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{log.method || "N/A"}</TableCell>
                                <TableCell>
                                    {log.location
                                        ? `${log.location.latitude.toFixed(3)}, ${log.location.longitude.toFixed(3)}`
                                        : "N/A"}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No attendance records found for this user.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
