"use client";

import React, { useState } from "react";
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
import { addRegisteredUser } from "@/lib/storage";
import type { WebcamCaptureRef } from "./WebcamCapture";
import { UserPlus } from "lucide-react";

interface UserRegistrationDialogProps {
  webcamRef: React.RefObject<WebcamCaptureRef>;
}

export function UserRegistrationDialog({ webcamRef }: UserRegistrationDialogProps) {
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleRegister = async () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter a name.",
        variant: "destructive",
      });
      return;
    }

    if (webcamRef.current) {
      try {
        const descriptor = await webcamRef.current.captureFace();
        if (descriptor) {
          addRegisteredUser({ name, descriptor });
          toast({
            title: "Success",
            description: `${name} has been registered.`,
          });
          // Reload face matcher in webcam component
          webcamRef.current.reloadFaceMatcher();
          setName("");
          setIsOpen(false);
        }
      } catch (error: any) {
        toast({
          title: "Registration Failed",
          description: error.message || "Could not capture face. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Enter the user's name and capture their face. Make sure the user is clearly visible in the camera feed.
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleRegister}>Capture and Register</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
