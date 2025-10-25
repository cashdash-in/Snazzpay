
'use client';

import { useState, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { Checkbox } from '@/components/ui/checkbox';
import type { SellerUser } from '@/app/seller-accounts/page';
import { getCollection } from '@/services/firestore';

function LoginForm() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);

         if (!email || !password) {
            toast({ variant: 'destructive', title: "Login Failed", description: "Please enter your email and password." });
            setIsLoading(false);
            return;
        }

        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must accept the terms and conditions to log in.' });
            setIsLoading(false);
            return;
        }
        
        try {
            let role = 'user'; // Default role

            // Temporary admin backdoor
            if (email.toLowerCase() === 'tempadmin@snazzpay.com' && password === 'password123') {
                role = 'admin';
                // Use the real admin user's credentials to get a valid token for the session
                const userCredential = await signInWithEmailAndPassword(auth, 'admin@snazzpay.com', 'password123456'); // Use the known admin email with a valid password
                const idToken = await userCredential.user.getIdToken();
                
                const response = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, role }),
                });

                if (!response.ok) throw new Error("Failed to create temp admin session");

            } else {
                 // Standard login flow
                let loginEmail = email;
                if (email.toLowerCase() === 'admin@snazzpay.com') {
                    role = 'admin';
                }
                
                const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
                const idToken = await userCredential.user.getIdToken();

                const response = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, role }),
                });

                if (!response.ok) {
                    const errorResult = await response.json();
                    throw new Error(errorResult.error);
                }
            }


            toast({ title: "Login Successful", description: "Redirecting to your dashboard." });
            
            const redirectedFrom = searchParams.get('redirectedFrom');
            if (redirectedFrom) {
                 router.push(redirectedFrom);
            } else {
                 router.push('/');
            }
            router.refresh();

        } catch (error: any) {
            console.error("Login Error:", error);
            let errorMessage = 'An unexpected error occurred during login.';
             if (error instanceof FirebaseError) {
                // Check for the specific error code for the temporary admin login failure
                if (error.code === 'auth/invalid-credential' && email.toLowerCase() !== 'tempadmin@snazzpay.com') {
                    errorMessage = 'Invalid credentials. Please check your email and password.';
                } else if (email.toLowerCase() === 'tempadmin@snazzpay.com') {
                     errorMessage = 'Could not log in as temporary admin. The primary admin account may have been changed. Please contact support.';
                }
                 else {
                    errorMessage = error.message;
                }
            }
            toast({ variant: 'destructive', title: "Login Error", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Admin Central</CardTitle>
                    <CardDescription>Log in to the main dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="Enter your email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <Label htmlFor="password">Password</Label>
                             <Link href="/auth/forgot-password" passHref>
                                <span className="text-xs text-primary hover:underline cursor-pointer">
                                    Forgot Password?
                                </span>
                            </Link>
                        </div>
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
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">
                            I agree to the <Link href="/terms/seller" target="_blank" className="underline text-primary">Master Service Agreement</Link> for each login session.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Are you a seller or vendor?{" "}
                        <Link href="/auth/signup" className="text-primary hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
