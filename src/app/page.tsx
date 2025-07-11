"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WebcamCapture, type WebcamCaptureRef } from "@/components/WebcamCapture";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const webcamRef = useRef<WebcamCaptureRef>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header webcamRef={webcamRef} />
        <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-4xl flex flex-col items-center gap-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="aspect-video w-full max-w-3xl rounded-lg" />
            <Skeleton className="h-10 w-36" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header webcamRef={webcamRef} />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Attendance Camera</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <WebcamCapture ref={webcamRef} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
