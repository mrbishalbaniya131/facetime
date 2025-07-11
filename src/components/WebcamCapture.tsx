"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getRegisteredUsers, addAttendanceLog, getAttendanceLog } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import type { RegisteredUser } from "@/types";

declare const faceapi: any;

export interface WebcamCaptureRef {
  captureFace: () => Promise<number[] | null>;
  reloadFaceMatcher: () => void;
}

export const WebcamCapture = forwardRef<WebcamCaptureRef, {}>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<any>(null);
  const { toast } = useToast();
  const attendanceToday = useRef<Set<string>>(new Set());

  const setup = async () => {
    // Models are loaded in ModelLoader
    await startWebcam();
    loadFaceMatcher();
    loadTodaysAttendance();
    setIsReady(true);
  };

  const loadTodaysAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const allLogs = getAttendanceLog();
    const todaysLogs = allLogs.filter(log => log.timestamp.startsWith(today));
    attendanceToday.current = new Set(todaysLogs.map(log => log.name));
  };
  
  useEffect(() => {
    setup();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const loadFaceMatcher = () => {
    const users: RegisteredUser[] = getRegisteredUsers();
    if (users.length > 0) {
      const labeledFaceDescriptors = users.map(
        (user) => new faceapi.LabeledFaceDescriptors(user.name, [new Float32Array(user.descriptor)])
      );
      const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.5);
      setFaceMatcher(matcher);
    }
  };

  useImperativeHandle(ref, () => ({
    captureFace: async () => {
      if (!videoRef.current) {
        throw new Error("Webcam not ready.");
      }
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error("No face detected. Please position yourself in front of the camera.");
      }
      return Array.from(detection.descriptor);
    },
    reloadFaceMatcher: () => {
      loadFaceMatcher();
    }
  }));

  const onPlay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const intervalId = setInterval(async () => {
      if (!video || video.paused || video.ended) {
        clearInterval(intervalId);
        return;
      }
      
      const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      resizedDetections.forEach((detection: any) => {
        let box = detection.detection.box;
        let drawBox = new faceapi.draw.DrawBox(box, { boxColor: '#00CED1' });
        
        if (faceMatcher) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          if (bestMatch.label !== 'unknown') {
            const name = bestMatch.label;
            drawBox = new faceapi.draw.DrawBox(box, { label: name, boxColor: '#1E90FF' });

            if (!attendanceToday.current.has(name)) {
              attendanceToday.current.add(name);
              addAttendanceLog({ name, timestamp: new Date().toISOString() });
              toast({
                title: "Attendance Marked",
                description: `Welcome, ${name}! Your attendance has been recorded.`,
              });
            }
          }
        }
        drawBox.draw(canvas);
      });

    }, 200);

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
