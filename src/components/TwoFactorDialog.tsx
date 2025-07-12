
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import type { TwoFactorChallenge } from "./WebcamCapture";

interface TwoFactorDialogProps {
  isOpen: boolean;
  challengeData: TwoFactorChallenge | null;
  onSuccess: (userName: string) => void;
  onClose: () => void;
}

export function TwoFactorDialog({ isOpen, challengeData, onSuccess, onClose }: TwoFactorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && challengeData) {
      handleFingerprintVerification();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, challengeData]);

  const handleFingerprintVerification = async () => {
    if (!challengeData) return;

    setIsLoading(true);
    const { user } = challengeData;

    try {
        const respChallenge = await fetch(`/api/login-challenge?username=${user.name}`);
        const options = await respChallenge.json();
        if (respChallenge.status !== 200) throw new Error(options.error);
        
        const authResp = await startAuthentication(options);

        const verificationResp = await fetch('/api/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.name, authResp }),
        });

        const verificationJSON = await verificationResp.json();
        if (!verificationJSON || !verificationJSON.verified) {
             throw new Error(verificationJSON.error || 'Fingerprint verification failed.');
        }
        
        toast({
            title: "Fingerprint Verified",
            description: `Welcome back, ${user.name}! Attendance marked.`,
        });
        
        onSuccess(user.name);

    } catch (error: any) {
         toast({
            title: "Two-Factor Failed",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
        });
        onClose(); // Close dialog on failure
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Face recognized for <span className="font-bold">{challengeData?.user.name}</span>. Please verify with your fingerprint to complete check-in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-8 gap-4">
            {isLoading ? (
                <>
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Waiting for fingerprint...</p>
                </>
            ) : (
                <>
                   <Fingerprint className="h-16 w-16 text-primary" />
                   <p className="text-muted-foreground">Touch the sensor to verify.</p>
                </>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
