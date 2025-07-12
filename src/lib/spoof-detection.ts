"use client";
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

let model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
let modelLoadingPromise: Promise<void> | null = null;

// Liveness detection often relies on subtle cues. A simple but effective
// check for printed photos or screen replays is to look for the absence
// of natural eye blinking over a short period.
const EYE_BLINK_THRESHOLD = 0.25; // Lower values mean more closed eyes

export async function loadSpoofModel() {
  if (model) {
    return;
  }
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      await tf.ready();
      console.log("Loading face landmarks model for spoof detection...");
      model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true, // This provides more accurate landmarks for eye calculations
        }
      );
      console.log("Liveness detection model loaded successfully.");
    } catch (error) {
      console.error("Error loading liveness detection model:", error);
      modelLoadingPromise = null; // Reset for retry
      throw new Error("Failed to load liveness detection model.");
    }
  })();
  return modelLoadingPromise;
}

function getEyeAspectRatio(eyeLandmarks: faceLandmarksDetection.Keypoint[]): number {
    // vertical distances
    const v1 = Math.hypot(eyeLandmarks[1].x - eyeLandmarks[7].x, eyeLandmarks[1].y - eyeLandmarks[7].y);
    const v2 = Math.hypot(eyeLandmarks[2].x - eyeLandmarks[6].x, eyeLandmarks[2].y - eyeLandmarks[6].y);
    const v3 = Math.hypot(eyeLandmarks[3].x - eyeLandmarks[5].x, eyeLandmarks[3].y - eyeLandmarks[5].y);

    // horizontal distance
    const h = Math.hypot(eyeLandmarks[0].x - eyeLandmarks[4].x, eyeLandmarks[0].y - eyeLandmarks[4].y);

    if (h === 0) return 0;
    
    return (v1 + v2 + v3) / (3 * h);
}


export async function isSpoof(video: HTMLVideoElement): Promise<boolean> {
  if (!model || !video) {
    return false;
  }

  try {
    const faces = await model.estimateFaces(video, {
      flipHorizontal: false,
    });
    
    if (faces.length === 0) {
      return false; // No face detected, so not a spoof for our purpose
    }
    
    const face = faces[0]; // Assuming one face for simplicity
    const keypoints = face.keypoints;

    const leftEyeLandmarks = keypoints.filter(p => p.name && p.name.startsWith('leftEye'));
    const rightEyeLandmarks = keypoints.filter(p => p.name && p.name.startsWith('rightEye'));

    if (leftEyeLandmarks.length < 8 || rightEyeLandmarks.length < 8) {
        return false; // Not enough landmarks for a reliable check
    }
    
    const leftEAR = getEyeAspectRatio(leftEyeLandmarks);
    const rightEAR = getEyeAspectRatio(rightEyeLandmarks);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // A very low EAR indicates the eyes are likely closed (a blink).
    // A photo or screen will have a consistently high EAR (eyes open).
    // This is a simplified check. A robust system would check for EAR changes over time.
    // For this prototype, we'll assume a "spoof" if the eyes are wide open.
    // In a real app, you'd check if avgEAR remains high for several seconds.
    if (avgEAR > EYE_BLINK_THRESHOLD) {
        // This could be a photo. Let's return true for demonstration.
        // In a real scenario, you'd track this over time.
        return true; 
    }

    return false;

  } catch (error) {
    console.error("Error during spoof detection:", error);
    return false;
  }
}
