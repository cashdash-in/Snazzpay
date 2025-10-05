
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Mail, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function SellerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        // This is a simulation. In a real app, you would have a backend
        // service to verify the loginId (email/phone) and send a login link/code.
        // For now, we just check for a hardcoded value for demonstration.
        
        const MOCK_SELLER_EMAIL = "seller@example.com";
        const MOCK_PASSWORD = "password";

        if (loginId.toLowerCase() !== MOCK_SELLER_EMAIL) {
            toast({
                variant: 'destructive',
                title: "Login Failed",
                description: "This email is not registered as a seller. For this demo, please use 'seller@example.com'.",
            });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, MOCK_SELLER_EMAIL, MOCK_PASSWORD);
            const idToken = await userCredential.user.getIdToken();

            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'seller' }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error);
            }

            toast({ title: "Seller Login Successful", description: "Redirecting to seller dashboard." });
            router.push('/seller/dashboard');
            router.refresh();

        } catch (error: any) {
             let errorMessage = 'An unexpected error occurred. For this demo, please ensure the user seller@example.com with password "password" exists in your Firebase Authentication.';
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    errorMessage = 'Demo user not found. Please create a user with email "seller@example.com" and password "password" in Firebase Auth.';
                }
            }
            toast({ variant: 'destructive', title: "Seller Login Error", description: errorMessage, duration: 8000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Store className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Seller Central</CardTitle>
                    <CardDescription>Log in to manage your products and orders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                type="text" 
                                placeholder="you@example.com or 9876543210" 
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
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="text-primary hover:underline">
                            Sign Up Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
