"use client";

declare const faceapi: any;

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) {
    console.log("Models already loaded.");
    return;
  }
  
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@0.22.2/models';
  
  try {
    console.log("Loading face-api models...");
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log("Face-api models loaded successfully.");
  } catch (error) {
    console.error("Error loading face-api models:", error);
    throw new Error("Failed to load face recognition models. Please check the console for details.");
  }
}
