
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addRegisteredUser, addAuthenticatorToUser, getRegisteredUserByName } from "@/lib/storage";
import type { WebcamCaptureRef } from "./WebcamCapture";
import { UserPlus, Loader2, Fingerprint } from "lucide-react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import type { RegisteredUser } from "@/types";

interface UserRegistrationDialogProps {
  webcamRef: React.RefObject<WebcamCaptureRef>;
}

export function UserRegistrationDialog({ webcamRef }: UserRegistrationDialogProps) {
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const [user, setUser] = useState<RegisteredUser | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    setIsWebAuthnSupported(browserSupportsWebAuthn());
  }, []);

  useEffect(() => {
    if (name) {
      setUser(getRegisteredUserByName(name));
    } else {
      setUser(undefined);
    }
  }, [name, isOpen]);


  const handleRegisterFace = async () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter a name.",
        variant: "destructive",
      });
      return;
    }
    
    const existingUser = getRegisteredUserByName(name);
    if (existingUser && existingUser.descriptor && existingUser.descriptor.length > 0) {
         toast({
            title: "Face Already Registered",
            description: "A face is already registered for this user.",
            variant: "destructive",
        });
        return;
    }

    if (webcamRef.current) {
      setIsLoading(true);
      try {
        const descriptor = await webcamRef.current.captureFace();
        if (descriptor) {
          const newUser = { name, descriptor, authenticators: existingUser?.authenticators || [] };
          // Add to client-side storage
          addRegisteredUser(newUser);
          
          // Also add to server-side "DB"
          await fetch('/api/register-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, descriptor }),
          });

          toast({
            title: "Success",
            description: `${name}'s face has been registered.`,
          });
          webcamRef.current.reloadFaceMatcher();
          setUser(getRegisteredUserByName(name)); // Refresh user state
        }
      } catch (error: any) {
        toast({
          title: "Registration Failed",
          description: error.message || "Could not capture face. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegisterFingerprint = async () => {
     if (!name) {
      toast({
        title: "Error",
        description: "Please enter a name first.",
        variant: "destructive",
      });
      return;
    }
    setIsWebAuthnLoading(true);
    try {
        // Ensure user exists on server before getting challenge
        let existingUser = getRegisteredUserByName(name);
        if (!existingUser) {
             const res = await fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, descriptor: null }), // Create user without descriptor
            });
            if (!res.ok) throw new Error("Failed to create user on server.");
            addRegisteredUser({ name, authenticators: [] }); // Add to local storage as well
        }

        // Get challenge from server
        const respChallenge = await fetch(`/api/register-challenge?username=${name}`);
        if (!respChallenge.ok) {
            const errorText = await respChallenge.text();
            throw new Error(`Failed to get registration challenge from server: ${errorText}`);
        }

        const options = await respChallenge.json();
        
        // Start registration with browser
        const regResp = await startRegistration(options);
        
        // Verify with server
        const verificationResp = await fetch('/api/register-verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: name,
                regResp,
            }),
        });

        const verificationJSON = await verificationResp.json();
        
        if (verificationJSON && verificationJSON.verified) {
             addAuthenticatorToUser(name, verificationJSON.authenticator);
             toast({
                title: "Fingerprint Registered",
                description: "You can now log in using your fingerprint.",
             });
             setUser(getRegisteredUserByName(name)); // Refresh user state
        } else {
            throw new Error(verificationJSON.error || 'Fingerprint verification failed.');
        }
    } catch (error: any) {
        toast({
            title: "Fingerprint Registration Failed",
            description: error.message || "An unknown error occurred. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsWebAuthnLoading(false);
    }
  }

  const faceRegistered = !!user?.descriptor && user.descriptor.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            setName(""); // Reset name on close
        }
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Register New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register New User</DialogTitle>
          <DialogDescription>
            Enter name, then capture face and/or register a fingerprint.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Jane Doe"
              disabled={isLoading || isWebAuthnLoading}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={handleRegisterFace} disabled={isLoading || isWebAuthnLoading || faceRegistered || !name}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing...
              </>
            ) : (
             "Capture Face"
            )}
          </Button>

          {isWebAuthnSupported && (
            <Button onClick={handleRegisterFingerprint} variant="outline" disabled={isWebAuthnLoading || isLoading || !name}>
              {isWebAuthnLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                <>
                <Fingerprint className="mr-2 h-4 w-4" />
                Register Fingerprint
                </>
              )}
            </Button>
          )}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
