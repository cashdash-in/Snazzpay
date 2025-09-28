'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Lock, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Vendor } from '@/app/vendors/page';
import { FirebaseError } from 'firebase/app';


export default function VendorLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        
        if (!email || !password) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter a valid email and password." });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = userCredential.user;
            
            // For prototype purposes, we check against the vendor list in localStorage.
            // In a real app, this would be a backend check against a database.
            const vendorsJSON = localStorage.getItem('vendors_db');
            const vendors: Vendor[] = vendorsJSON ? JSON.parse(vendorsJSON) : [];
            const isApprovedVendor = vendors.some(v => v.email === email && v.status === 'approved');

            if (!isApprovedVendor) {
                 await auth.signOut();
                 toast({ variant: 'destructive', title: "Access Denied", description: `Your vendor account is not approved. Please contact the admin.` });
                 setIsLoading(false);
                 return;
            }

            const idToken = await loggedInUser.getIdToken();
            
            // Set session cookie with the 'vendor' role
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'vendor' }),
            });
            
            toast({ title: "Vendor Login Successful", description: "Redirecting to your dashboard." });
            router.push('/vendor/dashboard');
            router.refresh();

        } catch (error: any) {
            console.error("Vendor Login failed:", error);
             let description = 'An unexpected error occurred during login.';
             if (error instanceof FirebaseError) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                    description = 'Invalid email or password. Please create an account via the main Signup page if you are new.';
                }
             }
            toast({ variant: 'destructive', title: "Login Error", description: description });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Factory className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Vendor Portal</CardTitle>
                    <CardDescription>Log in to your vendor dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Vendor Email</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="Your registered email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Enter your password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login as Vendor"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Are you a seller?{" "}
                        <Link href="/seller/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                         <span className="mx-1">|</span>
                         New here?{" "}
                         <Link href="/auth/signup" className="text-primary hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
