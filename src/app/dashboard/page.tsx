"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AttendanceList from "@/components/AttendanceList";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttendanceLog, getRegisteredUsers } from "@/lib/storage";
import { Users, Check, X, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceSummaryCard, type SummaryStat } from "@/components/AttendanceSummaryCard";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SummaryStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const allUsers = getRegisteredUsers();
      const allLogs = getAttendanceLog();
      
      const presentTodaySet = new Set(
        allLogs
          .filter(log => log.timestamp.startsWith(today))
          .map(log => log.name)
      );

      const totalUsers = allUsers.length;
      const presentCount = presentTodaySet.size;
      const absentCount = totalUsers - presentCount;
      const attendancePercentage = totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0;
      
      const summaryStats: SummaryStat[] = [
        { title: "Total Users", value: totalUsers.toString(), icon: <Users className="h-4 w-4 text-muted-foreground" /> },
        { title: "Present Today", value: presentCount.toString(), icon: <Check className="h-4 w-4 text-muted-foreground" /> },
        { title: "Absent Today", value: absentCount.toString(), icon: <X className="h-4 w-4 text-muted-foreground" /> },
        { title: "Attendance Rate", value: `${attendancePercentage}%`, icon: <Percent className="h-4 w-4 text-muted-foreground" /> },
      ];

      setStats(summaryStats);
      setStatsLoading(false);
    }
  }, [user]);

  if (loading || !user) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
            <Skeleton className="h-12 w-1/4 mb-6" />
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 font-headline">Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-2/4" />
                   <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map(stat => <AttendanceSummaryCard key={stat.title} {...stat} />)
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
                <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <AttendanceList />
                </CardContent>
            </Card>
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Chart component will be here.</p>
                </CardContent>
            </Card>
        </div>

      </main>
    </div>
  );
}
