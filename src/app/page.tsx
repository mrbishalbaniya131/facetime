"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WebcamCapture, type WebcamCaptureRef } from "@/components/WebcamCapture";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle, ShieldAlert, Activity, MapPin } from "lucide-react";
import type { AnalyzePersonOutput } from "@/ai/flows/compare-detected-faces";

interface AiLog {
  id: number;
  thought: string;
  activity?: string;
  timestamp: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const webcamRef = useRef<WebcamCaptureRef>(null);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  }, [audioSrc]);

  const handleNewAnalysis = (analysis: AnalyzePersonOutput) => {
    const newLog: AiLog = {
      id: Date.now(),
      thought: analysis.thought,
      activity: analysis.activityDescription,
      timestamp: new Date().toLocaleTimeString(),
    };
    setAiLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const handleNewAudio = (newAudioSrc: string) => {
    setAudioSrc(newAudioSrc);
  };

  const renderLog = (log: AiLog) => {
    let icon = <Bot className="h-4 w-4 text-primary shrink-0" />;
    if (log.thought.includes("Found best match")) {
      icon = <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    } else if (log.thought.includes("No match declared") || log.thought.includes("No potential matches") || log.thought.includes("below the threshold")) {
      icon = <ShieldAlert className="h-4 w-4 text-yellow-500 shrink-0" />;
    }
    
    // Split thoughts by newline to render them separately
    const thoughtLines = log.thought.split('\n');

    return (
       <div className="flex flex-col gap-2">
          {thoughtLines.map((line, index) => {
              let lineIcon = icon;
              if (line.includes("Location:")) {
                  lineIcon = <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
              }
              return (
                <div key={index} className="flex items-start gap-3">
                  {lineIcon}
                  <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">{line}</p>
                </div>
              )
            })
          }
          {log.activity && (
             <div className="flex items-start gap-3 pl-1">
                <Activity className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground break-words whitespace-pre-wrap">{log.activity}</p>
             </div>
          )}
       </div>
    )
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline">Attendance Camera</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <WebcamCapture 
                ref={webcamRef} 
                onNewAnalysis={handleNewAnalysis} 
                onNewAudio={handleNewAudio}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    <span className="font-headline">AI Activity Log</span>
                </CardTitle>
                <CardDescription>Real-time analysis from the recognition AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] w-full pr-4">
                    <div className="space-y-4">
                        {aiLogs.length > 0 ? (
                            aiLogs.map((log) => (
                                <div key={log.id} className="flex flex-col border-b pb-2 mb-2">
                                  <span className="text-xs font-mono text-muted-foreground/50">{log.timestamp}</span>
                                  {renderLog(log)}
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                Waiting for activity...
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} />
      )}
    </div>
  );
}
