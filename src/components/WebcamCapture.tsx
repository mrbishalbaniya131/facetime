"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getRegisteredUsers, addAttendanceLog, getAttendanceLog } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import type { RegisteredUser } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { analyzePerson, type AnalyzePersonInput, type AnalyzePersonOutput } from "@/ai/flows/compare-detected-faces";
import { textToSpeech } from "@/ai/flows/text-to-speech";

declare const faceapi: any;

export interface WebcamCaptureRef {
  captureFace: () => Promise<number[] | null>;
  reloadFaceMatcher: () => void;
}

interface WebcamCaptureProps {
  onNewAnalysis?: (analysis: AnalyzePersonOutput) => void;
  onNewAudio?: (audioSrc: string) => void;
}

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const attendanceToday = useRef<Set<string>>(new Set());
  const [detectorOptions, setDetectorOptions] = useState<any>(null);
  const { logout } = useAuth();
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const processing = useRef(false);

  useImperativeHandle(ref, () => ({
    captureFace: async () => {
      if (!videoRef.current) {
        throw new Error("Webcam not ready.");
      }
      if (!detectorOptions) {
        throw new Error("Face detector not initialized.");
      }
      const detection = await faceapi.detectSingleFace(videoRef.current, detectorOptions).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error("No face detected. Please position yourself in front of the camera.");
      }
      return Array.from(detection.descriptor);
    },
    reloadFaceMatcher: () => {
      // This method is now a bit redundant with the AI flow, but kept for potential future use.
      // The AI flow re-fetches users on every call, so it's always up-to-date.
    }
  }));

  useEffect(() => {
    // This ensures faceapi is defined before we use it.
    if (typeof faceapi !== 'undefined') {
       setDetectorOptions(new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }));
    }
  }, []);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
      });
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  const setup = async () => {
    // Models are loaded globally in AuthProvider
    await startWebcam();
    loadTodaysAttendance();
    setIsReady(true);
    resetInactivityTimer();
  };

  const loadTodaysAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const allLogs = getAttendanceLog();
    const todaysLogs = allLogs.filter(log => log.timestamp.startsWith(today));
    attendanceToday.current = new Set(todaysLogs.map(log => log.name));
  };
  
  useEffect(() => {
    if (detectorOptions) { // Only run setup once detectorOptions is set
        setup();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
       if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectorOptions]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Webcam Error",
        description: "Could not access webcam. Please allow camera permissions.",
        variant: "destructive",
      });
    }
  };

  const onPlay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !detectorOptions) return;

    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const intervalId = setInterval(async () => {
      if (!video || video.paused || video.ended || processing.current) {
        return;
      }
      
      const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks().withFaceDescriptors();
      
      if (detections.length > 0) {
        resetInactivityTimer();
      }

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const users = getRegisteredUsers();
      if (users.length > 0) {
        for (const detection of resizedDetections) {
          processing.current = true;
          try {
            const registeredUserDescriptors = users
              .filter(u => u.descriptor && u.descriptor.length > 0)
              .map(u => ({ userId: u.name, descriptor: u.descriptor! }));
            
            if (registeredUserDescriptors.length === 0) {
                const box = detection.detection.box;
                const drawBox = new faceapi.draw.DrawBox(box, { label: 'No registered faces', boxColor: '#FFA500' });
                drawBox.draw(canvas);
                continue; // Skip to next detection
            }

            // Capture the current frame as a data URI
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = video.videoWidth;
            frameCanvas.height = video.videoHeight;
            const frameCtx = frameCanvas.getContext('2d');
            if(frameCtx) {
              frameCtx.drawImage(video, 0, 0);
            }
            const imageDataUri = frameCanvas.toDataURL('image/jpeg');

            const aiInput: AnalyzePersonInput = {
              imageDataUri,
              detectedFaceDescriptor: Array.from(detection.descriptor),
              registeredUserDescriptors,
            };

            const result = await analyzePerson(aiInput);

            if (props.onNewAnalysis) {
                props.onNewAnalysis(result);
            }

            let box = detection.detection.box;
            let drawBox = new faceapi.draw.DrawBox(box, { boxColor: '#00CED1', label: 'Analyzing...' });

            if (result.userId && result.matchConfidence) {
                const name = result.userId;
                drawBox = new faceapi.draw.DrawBox(box, { label: `${name} (${(result.matchConfidence*100).toFixed(1)}%)`, boxColor: '#1E90FF' });

                if (!attendanceToday.current.has(name)) {
                  attendanceToday.current.add(name);
                  addAttendanceLog({ name, timestamp: new Date().toISOString() });
                  
                  const toastMessage = `Welcome, ${name}! Your attendance has been recorded.`;
                  toast({
                    title: "Attendance Marked",
                    description: toastMessage,
                  });

                  // Generate and play voice alert
                  if (props.onNewAudio) {
                    try {
                      const { audio } = await textToSpeech(toastMessage);
                      props.onNewAudio(audio);
                    } catch (ttsError) {
                      console.error("Error generating TTS:", ttsError);
                    }
                  }
                }
            } else {
                drawBox = new faceapi.draw.DrawBox(box, { label: `Unknown`, boxColor: '#FF6347' });
            }
            drawBox.draw(canvas);

          } catch (error) {
             console.error("Error during face analysis flow:", error);
          } finally {
            processing.current = false;
          }
        }
      } else {
         resizedDetections.forEach((detection: any) => {
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: 'No registered faces', boxColor: '#FFA500' });
            drawBox.draw(canvas);
         });
      }

    }, 2000); // Run every 2 seconds to not overload the AI

    return () => clearInterval(intervalId);
  };


  return (
    <div className="relative w-full max-w-3xl aspect-video mx-auto flex items-center justify-center">
      {!isReady && <Skeleton className="w-full h-full" />}
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={onPlay}
        className={`rounded-lg transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}
        style={{ transform: "scaleX(-1)" }} // Mirror effect
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
});

WebcamCapture.displayName = 'WebcamCapture';
