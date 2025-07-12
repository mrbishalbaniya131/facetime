"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getRegisteredUsers, addAttendanceLog, getAttendanceLog } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import type { RegisteredUser } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { analyzePerson, type AnalyzePersonInput, type AnalyzePersonOutput } from "@/ai/flows/compare-detected-faces";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { MapPin, AlertTriangle, ShieldAlert } from "lucide-react";

declare const faceapi: any;

const AUTHORIZED_LOCATION = {
  latitude: 37.422,
  longitude: -122.084,
};
const MAX_DISTANCE_METERS = 500;

export interface WebcamCaptureRef {
  captureFace: () => Promise<number[] | null>;
  reloadFaceMatcher: () => void;
}

interface WebcamCaptureProps {
  onNewAnalysis?: (analysis: AnalyzePersonOutput) => void;
  onNewAudio?: (audioSrc: string) => void;
}

const INACTIVITY_TIMEOUT = 2 * 60 * 1000;

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
  const [locationState, setLocationState] = useState<{
    hasPermission: boolean | null;
    isAuthorized: boolean | null;
    currentCoords: { latitude: number; longitude: number } | null;
  }>({ hasPermission: null, isAuthorized: null, currentCoords: null });

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  const checkLocation = () => {
    if (!navigator.geolocation) {
       setLocationState({ hasPermission: false, isAuthorized: null, currentCoords: null });
       return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistanceInMeters(
          latitude,
          longitude,
          AUTHORIZED_LOCATION.latitude,
          AUTHORIZED_LOCATION.longitude
        );
        setLocationState({
          hasPermission: true,
          isAuthorized: distance <= MAX_DISTANCE_METERS,
          currentCoords: { latitude, longitude },
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationState({ hasPermission: false, isAuthorized: null, currentCoords: null });
        toast({
          title: "Location Access Denied",
          description: "Location is optional, but recommended for verified attendance.",
          variant: "default",
        });
      },
      { enableHighAccuracy: true }
    );
  };

  useImperativeHandle(ref, () => ({
    captureFace: async () => {
      if (!videoRef.current) throw new Error("Webcam not ready.");
      if (!detectorOptions) throw new Error("Face detector not initialized.");
      
      const detection = await faceapi.detectSingleFace(videoRef.current, detectorOptions).withFaceLandmarks().withFaceDescriptor();
      if (!detection) throw new Error("No face detected. Please position yourself in front of the camera.");
      
      return Array.from(detection.descriptor);
    },
    reloadFaceMatcher: () => {}
  }));

  useEffect(() => {
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
    await startWebcam();
    loadTodaysAttendance();
    checkLocation();
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
    if (detectorOptions) {
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
      if (!video || video.paused || video.ended || processing.current) return;
      
      const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
      
      if (detections.length > 0) resetInactivityTimer();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const users = getRegisteredUsers();
      if (users.length > 0) {
        for (const detection of resizedDetections) {
          
          if (!detection || !detection.expressions) {
            continue; // Skip if expressions are not available for this frame
          }

          processing.current = true;
          try {
            const registeredUserDescriptors = users
              .filter(u => u.descriptor && u.descriptor.length > 0)
              .map(u => ({ userId: u.name, descriptor: u.descriptor! }));
            
            if (registeredUserDescriptors.length === 0) {
                const box = detection.detection.box;
                const drawBox = new faceapi.draw.DrawBox(box, { label: 'No registered faces', boxColor: '#FFA500' });
                drawBox.draw(canvas);
                continue;
            }

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = video.videoWidth;
            frameCanvas.height = video.videoHeight;
            const frameCtx = frameCanvas.getContext('2d');
            if(frameCtx) frameCtx.drawImage(video, 0, 0);
            const imageDataUri = frameCanvas.toDataURL('image/jpeg');
            
            const expressions = (typeof detection.expressions === 'object' && Object.keys(detection.expressions).length > 0) 
              ? detection.expressions 
              : {};


            const aiInput: AnalyzePersonInput = {
              imageDataUri,
              detectedFaceDescriptor: Array.from(detection.descriptor),
              registeredUserDescriptors,
              isLocationAuthorized: locationState.isAuthorized,
              expressions,
            };

            const result = await analyzePerson(aiInput);
            
            if (props.onNewAnalysis) props.onNewAnalysis(result);


            if (result.audioSrc && props.onNewAudio) props.onNewAudio(result.audioSrc);

            let box = detection.detection.box;
            let drawBox = new faceapi.draw.DrawBox(box, { boxColor: '#00CED1', label: 'Analyzing...' });

            if (result.userId && result.matchConfidence) {
                const name = result.userId;
                const label = `${name} (${(result.matchConfidence*100).toFixed(1)}%)`
                drawBox = new faceapi.draw.DrawBox(box, { label, boxColor: '#1E90FF' });

                if (!attendanceToday.current.has(name)) {
                  attendanceToday.current.add(name);
                  addAttendanceLog({ name, timestamp: new Date().toISOString(), location: locationState.currentCoords, mood: result.mood });
                  
                  const toastMessage = `Welcome, ${name}! Attendance recorded.`;
                  toast({
                    title: "Attendance Marked",
                    description: toastMessage,
                  });

                  if (props.onNewAudio) {
                    try {
                      const { audio } = await textToSpeech(toastMessage);
                      props.onNewAudio(audio);
                    } catch (ttsError) {
                      console.error("Error generating TTS for attendance:", ttsError);
                    }
                  }
                }
            } else {
                 const label = `Unknown`;
                 const boxColor = '#FF6347';
                 drawBox = new faceapi.draw.DrawBox(box, { label, boxColor });
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

    }, 3000);

    return () => clearInterval(intervalId);
  };


  return (
    <div className="relative w-full max-w-3xl aspect-video mx-auto flex flex-col items-center justify-center gap-2">
      {!isReady && <Skeleton className="w-full h-full" />}
      <div className="relative w-full">
        <video
            ref={videoRef}
            autoPlay
            muted
            onPlay={onPlay}
            className={`rounded-lg transition-opacity duration-500 w-full ${isReady ? "opacity-100" : "opacity-0"}`}
            style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>
      {locationState.hasPermission === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Location Access Denied</AlertTitle>
          <AlertDescription>
            You must allow location access to mark verified attendance.
          </AlertDescription>
        </Alert>
      )}
      {locationState.hasPermission && locationState.isAuthorized === false && (
         <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Outside Authorized Area</AlertTitle>
          <AlertDescription>
            Attendance from this location will be marked as unverified.
          </AlertDescription>
        </Alert>
      )}
      {locationState.isAuthorized && (
         <Alert variant="default" className="border-green-300 bg-green-50 text-green-800">
            <MapPin className="h-4 w-4 text-green-600" />
            <AlertTitle>Location Verified</AlertTitle>
            <AlertDescription>
                You are within the authorized area. Attendance will be marked as verified.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
});

WebcamCapture.displayName = 'WebcamCapture';
