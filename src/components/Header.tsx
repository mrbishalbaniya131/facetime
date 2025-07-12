
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, LayoutDashboard, LogOut, Camera, Users } from "lucide-react";
import { UserRegistrationDialog } from "./UserRegistrationDialog";
import type { WebcamCaptureRef } from "./WebcamCapture";

interface HeaderProps {
    webcamRef?: React.RefObject<WebcamCaptureRef>;
}

export default function Header({ webcamRef }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Attendance", icon: Camera },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Users", icon: Users },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Eye className="h-6 w-6 text-primary" />
            <span className="font-headline hidden sm:inline-block">FaceTime Attendance</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4 text-sm lg:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-2",
                pathname === link.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              <link.icon className="h-4 w-4" />
              <span className="hidden md:inline-block">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">Welcome, {user.username}</span>
            {pathname === '/' && webcamRef && (
                <UserRegistrationDialog webcamRef={webcamRef} />
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
        </div>
      </div>
    </header>
  );
}
