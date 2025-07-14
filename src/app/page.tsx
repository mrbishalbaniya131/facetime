"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WebcamCapture, type WebcamCaptureRef, type TwoFactorChallenge } from "@/components/WebcamCapture";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle, ShieldAlert, Activity, MapPin, Smile } from "lucide-react";
import type { AnalyzePersonOutput } from "@/ai/flows/compare-detected-faces";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

interface AiLog {
  id: number;
  thought: string;
  activity?: string;
  mood?: string;
  timestamp: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const webcamRef = useRef<WebcamCaptureRef>(null);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [twoFactorState, setTwoFactorState] = useState<{
    isOpen: boolean;
    challenge: TwoFactorChallenge | null;
  }>({ isOpen: false, challenge: null });


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
      mood: analysis.mood,
      timestamp: new Date().toLocaleTimeString(),
    };
    setAiLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const handleNewAudio = (newAudioSrc: string) => {
    setAudioSrc(newAudioSrc);
  };
  
  const handleTwoFactorChallenge = (challenge: TwoFactorChallenge) => {
    handleNewAnalysis({
      thought: `Face recognized for ${challenge.user.name}. Awaiting fingerprint verification...`
    });
    setTwoFactorState({ isOpen: true, challenge });
  };
  
  const handleTwoFactorSuccess = (userName: string) => {
    setTwoFactorState({ isOpen: false, challenge: null });
    handleNewAnalysis({
      thought: `Fingerprint verified for ${userName}. Two-Factor authentication successful.`
    });
    webcamRef.current?.markTwoFactorAttendance(userName);
  }

  const renderLog = (log: AiLog) => {
    let icon = <Bot className="h-4 w-4 text-primary shrink-0" />;
    if (log.thought.includes("Found best match") || log.thought.includes("(Attended)") || log.thought.includes("successful")) {
      icon = <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    } else if (log.thought.includes("No match declared") || log.thought.includes("No potential matches") || log.thought.includes("below the threshold") || log.thought.includes("Spoof attempt")) {
      icon = <ShieldAlert className="h-4 w-4 text-yellow-500 shrink-0" />;
    }
    
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
          {log.mood && (
             <div className="flex items-start gap-3 pl-1">
                <Smile className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground break-words whitespace-pre-wrap">Mood: {log.mood}</p>
             </div>
          )}
       </div>
    )
  }

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-4xl flex flex-col items-center gap-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="aspect-video w-full max-w-3xl rounded-lg" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
        webcamRef={webcamRef}
        isSecureMode={isSecureMode}
        onSecureModeChange={setIsSecureMode}
    >
        <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex flex-col">
            <PageHeader 
                title="FaceTime Attendance"
                description="Real-time attendance and activity monitoring during your FaceTime calls."
            />
            <div className="flex-grow grid gap-8 md:grid-cols-5">
                <div className="md:col-span-3">
                    <Card className="shadow-lg h-full">
                        <CardHeader>
                            <CardTitle className="text-2xl font-headline">Live Feed</CardTitle>
                            <CardDescription>The system is actively scanning for faces.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <WebcamCapture 
                                ref={webcamRef} 
                                onNewAnalysis={handleNewAnalysis} 
                                onNewAudio={handleNewAudio}
                                onTwoFactorChallenge={handleTwoFactorChallenge}
                                isSecureMode={isSecureMode}
                            />
                        </CardContent>
                    </Card>
                </div>
                
                <div className="md:col-span-2">
                    <Card className="shadow-lg h-full">
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
            </div>
        </main>
        {audioSrc && (
            <audio ref={audioRef} src={audioSrc} autoPlay />
        )}
        <TwoFactorDialog
            isOpen={twoFactorState.isOpen}
            challengeData={twoFactorState.challenge}
            onSuccess={handleTwoFactorSuccess}
            onClose={() => setTwoFactorState({ isOpen: false, challenge: null })}
        />
    </AppLayout>
  );
}
