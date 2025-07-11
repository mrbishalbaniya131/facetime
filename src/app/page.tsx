"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WebcamCapture, type WebcamCaptureRef } from "@/components/WebcamCapture";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle, ShieldAlert } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const webcamRef = useRef<WebcamCaptureRef>(null);
  const [aiThoughts, setAiThoughts] = useState<string[]>([]);
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

  const handleNewThought = (thought: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAiThoughts(prev => [`[${timestamp}] ${thought}`, ...prev].slice(0, 100)); // Keep last 100 thoughts
  };

  const handleNewAudio = (newAudioSrc: string) => {
    setAudioSrc(newAudioSrc);
  };

  const renderThought = (thought: string) => {
    let icon = <Bot className="h-4 w-4 text-primary shrink-0" />;
    if (thought.includes("Found best match")) {
      icon = <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    } else if (thought.includes("No match declared") || thought.includes("No potential matches") || thought.includes("below the threshold")) {
      icon = <ShieldAlert className="h-4 w-4 text-yellow-500 shrink-0" />;
    }
    
    return (
       <div className="flex items-start gap-3">
        {icon}
        <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">{thought.substring(thought.indexOf(']') + 2)}</p>
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
                onNewThought={handleNewThought} 
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
                <CardDescription>Real-time thoughts from the recognition AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96 w-full pr-4">
                    <div className="space-y-4">
                        {aiThoughts.length > 0 ? (
                            aiThoughts.map((thought, index) => (
                                <div key={index} className="flex flex-col">
                                  <span className="text-xs font-mono text-muted-foreground/50">{thought.substring(1, thought.indexOf(']'))}</span>
                                  {renderThought(thought)}
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
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}
    </div>
  );
}
