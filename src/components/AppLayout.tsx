
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Header from "./Header";
import type { WebcamCaptureRef } from "./WebcamCapture";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Camera,
  LayoutDashboard,
  Users,
  Eye,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
  webcamRef?: React.RefObject<WebcamCaptureRef> | null;
  isSecureMode?: boolean;
  onSecureModeChange?: (isSecure: boolean) => void;
}

const navLinks = [
    { href: "/", label: "Attendance", icon: Camera },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Users", icon: Users },
];

function AppLayoutContent({ children, webcamRef, isSecureMode, onSecureModeChange }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 font-bold text-sidebar-foreground">
            <Eye className="size-6 text-primary" />
            <span className={cn("font-headline", state === "collapsed" && "hidden")}>
              FaceTime Attendance
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href} passHref>
                  <SidebarMenuButton
                    isActive={pathname === link.href}
                    tooltip={{
                      children: link.label,
                    }}
                  >
                    <link.icon className="size-4" />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {user && (
            <p className="text-xs text-muted-foreground px-2">
              Welcome, {user.username}
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="justify-start">
            <LogOut className="mr-2" />
            <span className={cn(state === "collapsed" && "hidden")}>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
          <Header webcamRef={webcamRef} isSecureMode={isSecureMode!} onSecureModeChange={onSecureModeChange!} />
          {children}
      </SidebarInset>
    </>
  );
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent {...props} />
    </SidebarProvider>
  );
}
