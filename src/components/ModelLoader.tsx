"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

declare const faceapi: any;

const MODEL_FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

const GITHUB_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

async function storeModelFile(fileName: string): Promise<IDBValidKey> {
  const response = await fetch(`${GITHUB_MODEL_URL}${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
  }
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('face-api-models', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const putRequest = store.put(blob, `/models/${fileName}`);
      
      transaction.oncomplete = () => {
        db.close();
        resolve(putRequest.result);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export function ModelLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const request = indexedDB.open('face-api-models', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['models'], 'readonly');
        const store = transaction.objectStore('models');
        const countRequest = store.count();

        transaction.oncomplete = async () => {
          db.close();
          if (countRequest.result === MODEL_FILES.length) {
            console.log("All models are already in IndexedDB.");
            setLoading(false);
            return;
          }
          
          console.log("Models not found in cache. Downloading...");
          toast({
              title: 'Downloading Models',
              description: 'Please wait while we download necessary files. This may take a moment.',
          });
          
          await Promise.all(MODEL_FILES.map(file => storeModelFile(file)));

          toast({
              title: 'Download Complete',
              description: 'Face recognition models have been successfully downloaded.',
          });
          setLoading(false);
        };
        transaction.onerror = () => {
          db.close();
          throw transaction.error;
        }
      };
      request.onerror = (event) => {
        throw (event.target as IDBOpenDBRequest).error;
      }

    } catch (err: any) {
      console.error("Model loading failed:", err);
      setError(err.message || "An unknown error occurred while loading models.");
      toast({
        variant: 'destructive',
        title: 'Model Loading Failed',
        description: 'Could not download or access face recognition models. Please try again.',
      });
    }
  };

  useEffect(() => {
    // Override faceapi's fetch implementation to use IndexedDB
    faceapi.env.monkeyPatch({
      fetch: async (url: string) => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('face-api-models', 1);
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['models'], 'readonly');
            const store = transaction.objectStore('models');
            const getRequest = store.get(url);

            transaction.oncomplete = () => {
              if (getRequest.result) {
                resolve(new Response(getRequest.result));
              } else {
                 reject(new Error(`Model not found in IndexedDB: ${url}`));
              }
               db.close();
            };
             transaction.onerror = () => {
                reject(transaction.error);
                db.close();
            };
          };
           request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
          };
        });
      }
    });
    
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md space-y-4">
                <h2 className="text-2xl font-bold text-center">Loading Resources...</h2>
                <p className="text-center text-muted-foreground">Please wait while we set up the application.</p>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Initialization Failed</AlertTitle>
            <AlertDescription>
            There was a problem loading essential resources for the application. Please check your internet connection and try again.
            <p className="text-xs mt-2 text-muted-foreground">{error}</p>
            </AlertDescription>
            <div className="mt-4">
                <Button onClick={initialize}>Try Again</Button>
            </div>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
