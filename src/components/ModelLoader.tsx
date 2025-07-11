"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { loadModels } from '@/lib/face-api';

export function ModelLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);
      
      toast({
        title: 'Loading Models',
        description: 'Please wait while we initialize face recognition...',
      });

      await loadModels();

      toast({
        title: 'Ready',
        description: 'Face recognition models loaded successfully.',
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error("Model loading failed:", err);
      setError(err.message || "An unknown error occurred while loading models.");
      toast({
        variant: 'destructive',
        title: 'Model Loading Failed',
        description: 'Could not access face recognition models. Please try again.',
      });
      setLoading(false); // Set loading to false even on error to show the error message
    }
  };

  useEffect(() => {
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
