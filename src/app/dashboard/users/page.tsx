
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { getRegisteredUsers, addRegisteredUser } from "@/lib/storage";
import type { RegisteredUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, Smile } from "lucide-react";
import { UserActions } from "@/components/UserActions";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // This function is now the single source of truth for fetching users.
  // It syncs localStorage with the server's user-db.json on first load.
  const syncAndFetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/get-users'); // We'll create this new API route
      if (!response.ok) {
        throw new Error('Failed to fetch users from server');
      }
      const serverUsers = await response.json();
      
      // Update localStorage with the latest data from the server
      localStorage.setItem("face-time-registered-users", JSON.stringify(serverUsers));
      
      setUsers(serverUsers);
    } catch (error) {
      console.error("Failed to sync users:", error);
      // Fallback to localStorage if server fetch fails
      const localUsers = getRegisteredUsers();
      setUsers(localUsers);
    } finally {
        setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if(user) {
        syncAndFetchUsers();
    }
  }, [user, syncAndFetchUsers]);

  const handleUserUpdate = () => {
    // Just re-run the sync and fetch to get the latest state
    syncAndFetchUsers();
  }

  if (loading || !user || dataLoading) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-6 font-headline">User Management</h1>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 font-headline">User Management</h1>
        <Card>
            <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>A list of all users registered in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Face Registered</TableHead>
                        <TableHead>Fingerprint Registered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.length > 0 ? (
                        users.map((u) => (
                        <TableRow key={u.name}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>
                                {u.descriptor && u.descriptor.length > 0 ? (
                                    <Badge variant="secondary" className="text-green-600 border-green-200">
                                        <Smile className="mr-1 h-3 w-3" /> Yes
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">No</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                {u.authenticators && u.authenticators.length > 0 ? (
                                     <Badge variant="secondary" className="text-blue-600 border-blue-200">
                                        <Fingerprint className="mr-1 h-3 w-3" /> Yes ({u.authenticators.length})
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">No</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <UserActions user={u} onUserUpdate={handleUserUpdate} />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No users registered yet.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
