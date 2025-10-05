
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Lock, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';


export default function VendorLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const MOCK_VENDOR_EMAIL = "vendor@example.com";
    const MOCK_PASSWORD = "password";

    const handleLogin = async () => {
        setIsLoading(true);

         if (loginId.toLowerCase() !== MOCK_VENDOR_EMAIL) {
            toast({
                variant: 'destructive',
                title: "Login Failed",
                description: "This email is not registered as a vendor. For this demo, please use 'vendor@example.com'.",
            });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, MOCK_VENDOR_EMAIL, MOCK_PASSWORD);
            const idToken = await userCredential.user.getIdToken();

            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'vendor' }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error);
            }

            toast({ title: "Vendor Login Successful", description: "Redirecting to vendor dashboard." });
            router.push('/vendor/dashboard');
            router.refresh();

        } catch (error: any) {
            let errorMessage = 'An unexpected error occurred. For this demo, please ensure the user vendor@example.com with password "password" exists in your Firebase Authentication.';
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    errorMessage = 'Demo user not found. Please create a user with email "vendor@example.com" and password "password" in Firebase Auth.';
                }
            }
            toast({ variant: 'destructive', title: "Vendor Login Error", description: errorMessage, duration: 8000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Factory className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Vendor Portal</CardTitle>
                    <CardDescription>Login to your vendor dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                type="text" 
                                placeholder="Your registered email or mobile" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Login Link...</> : "Send Login Link"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
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
