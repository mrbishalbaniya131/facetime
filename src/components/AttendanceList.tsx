"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { getAttendanceLog, deleteAttendanceRecord } from "@/lib/storage";
import type { AttendanceRecord } from "@/types";
import { User, Clock, MapPin, Smile, MoreHorizontal, FileDown } from "lucide-react";
import { Button } from "./ui/button";
import { AttendanceActions } from "./AttendanceActions";

export default function AttendanceList() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const fetchAndSetAttendance = () => {
    const log = getAttendanceLog();
    log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAttendance(log);
  }

  useEffect(() => {
    fetchAndSetAttendance();

    const handleStorageChange = () => {
       fetchAndSetAttendance();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };

  }, []);
  
  const handleRecordDeleted = (recordId: string) => {
    deleteAttendanceRecord(recordId);
    fetchAndSetAttendance(); // Re-fetch and re-render the list
  }
  
  const exportToCSV = () => {
    const headers = ["Name", "Timestamp", "Mood", "Location", "Method"];
    const csvRows = [
      headers.join(','),
      ...attendance.map(row => [
        `"${row.name}"`,
        `"${new Date(row.timestamp).toLocaleString()}"`,
        `"${row.mood || 'N/A'}"`,
        `"${row.location ? `${row.location.latitude.toFixed(3)}, ${row.location.longitude.toFixed(3)}` : 'N/A'}"`,
        `"${row.method || 'N/A'}"`
      ].join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance-log-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  return (
    <>
      <div className="flex justify-end p-4">
        <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export to CSV
        </Button>
      </div>
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
             <TableHead>
              <div className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                Method
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.length > 0 ? (
            attendance.slice(0, 5).map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.name}</TableCell>
                <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                 <TableCell>{record.method || "N/A"}</TableCell>
                <TableCell>
                  {record.location 
                    ? `${record.location.latitude.toFixed(3)}, ${record.location.longitude.toFixed(3)}`
                    : "N/A"
                  }
                </TableCell>
                <TableCell className="text-right">
                    <AttendanceActions record={record} onDelete={handleRecordDeleted} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                No attendance records found for today.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
