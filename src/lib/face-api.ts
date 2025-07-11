"use client";

import { useToast } from "@/hooks/use-toast";

declare const faceapi: any;

export async function loadModels() {
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
  } catch (error) {
    console.error("Error loading face-api models:", error);
    // The useToast hook can't be used in a non-component function.
    // We'll rely on console errors and component-level error handling.
    throw new Error("Failed to load face recognition models. Please check the console for details.");
  }
}
