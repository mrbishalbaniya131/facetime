"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Eye, ShieldCheck, ShieldOff } from "lucide-react";
import { UserRegistrationDialog } from "./UserRegistrationDialog";
import type { WebcamCaptureRef } from "./WebcamCapture";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { SidebarTrigger } from "./ui/sidebar";

interface HeaderProps {
    webcamRef?: React.RefObject<WebcamCaptureRef> | null;
    isSecureMode: boolean;
    onSecureModeChange: (isSecure: boolean) => void;
}

export default function Header({ webcamRef, isSecureMode, onSecureModeChange }: HeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center md:hidden">
            <SidebarTrigger />
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-4">
            {pathname === '/' && webcamRef && onSecureModeChange && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                     <div className="flex items-center space-x-2">
                        <Switch
                          id="secure-mode"
                          checked={isSecureMode}
                          onCheckedChange={onSecureModeChange}
                          aria-label="Secure Mode"
                        />
                         {isSecureMode 
                          ? <ShieldCheck className="h-5 w-5 text-green-600" />
                          : <ShieldOff className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable Secure Mode for Two-Factor (Face + Fingerprint) Authentication</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {pathname === '/' && webcamRef && (
                <UserRegistrationDialog webcamRef={webcamRef} />
            )}
        </div>
      </div>
    </header>
  );
}
