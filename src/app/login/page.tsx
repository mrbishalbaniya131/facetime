"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, Fingerprint, Loader2 } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { getRegisteredUserByName } from "@/lib/storage";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const { user, login, loginWithWebAuthn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  useEffect(() => {
    setIsWebAuthnSupported(browserSupportsWebAuthn());
  }, []);

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    }
  };

  const handleFingerprintLogin = async () => {
    if (!username) {
        toast({
            title: "Username required",
            description: "Please enter your username to log in with a fingerprint.",
            variant: "destructive",
        });
        return;
    }

    const registeredUser = getRegisteredUserByName(username);
    if (!registeredUser || !registeredUser.authenticators || registeredUser.authenticators.length === 0) {
        toast({
            title: "Not Registered",
            description: "This user has not registered a fingerprint. Please register first.",
            variant: "destructive",
        });
        return;
    }
      
    setIsWebAuthnLoading(true);
    try {
        // 1. Get challenge from server
        const respChallenge = await fetch(`/api/login-challenge?username=${username}`);
        const options = await respChallenge.json();
        if (respChallenge.status !== 200) throw new Error(options.error);
        
        // 2. Authenticate with browser
        const authResp = await startAuthentication(options);

        // 3. Verify assertion with server
        const verificationResp = await fetch('/api/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                authResp
            }),
        });

        const verificationJSON = await verificationResp.json();
        if (!verificationJSON || !verificationJSON.verified) {
             throw new Error(verificationJSON.error || 'Fingerprint verification failed.');
        }

        await loginWithWebAuthn(username);

        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push("/");

    } catch (error: any) {
         toast({
            title: "Fingerprint Login Failed",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsWebAuthnLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-blue-50">
       <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <Eye className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold font-headline text-foreground">FaceTime Attendance</h1>
        <p className="text-muted-foreground">Smart attendance using face recognition.</p>
      </div>
      <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the system.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full">Sign In</Button>
            {isWebAuthnSupported && (
                 <Button type="button" variant="outline" className="w-full" onClick={handleFingerprintLogin} disabled={isWebAuthnLoading}>
                    {isWebAuthnLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Fingerprint className="mr-2 h-4 w-4" />
                    )}
                    Login with Fingerprint
                </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}