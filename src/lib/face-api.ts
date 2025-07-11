"use client";

declare const faceapi: any;

let modelsLoaded = false;
let modelsLoadingPromise: Promise<void> | null = null;

const checkFaceApi = () => {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (typeof faceapi !== 'undefined' && faceapi.nets) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};


export async function loadModels() {
    if (modelsLoaded) {
      return;
    }
    if (modelsLoadingPromise) {
      return modelsLoadingPromise;
    }

    modelsLoadingPromise = (async () => {
        try {
            await checkFaceApi();
            console.log("Loading face-api models...");
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
              faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            ]);
            modelsLoaded = true;
            console.log("Face-api models loaded successfully.");
        } catch (error) {
            console.error("Error loading face-api models:", error);
            modelsLoadingPromise = null; // Reset for retry
            throw new Error("Failed to load face recognition models. Please check the console for details.");
        }
    })();

    return modelsLoadingPromise;
}
